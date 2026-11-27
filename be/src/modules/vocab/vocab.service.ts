import { Injectable, NotFoundException } from '@nestjs/common';
import { HskCollectionsService } from '../../database/hsk-collections.service';
import { ProfileService } from '../profile/profile.service';
import { CreateVocabDto, UpdateVocabDto, UpdateVocabStatusDto } from './vocab.dto';

function normalizeSearch(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

@Injectable()
export class VocabService {
  constructor(
    private readonly hskCollections: HskCollectionsService,
    private readonly profileService: ProfileService,
  ) {}

  async findAll(query: { level?: string; status?: string; lessonId?: string; search?: string }) {
    const filter: Record<string, any> = {};
    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }
    if (query.lessonId) {
      filter.lessonId = query.lessonId;
    }

    let list: any[];
    if (query.level && query.level !== 'all') {
      const lv = Number(query.level);
      if (Number.isFinite(lv) && lv >= 1 && lv <= 6) {
        list = await this.hskCollections
          .getLevel(lv)
          .vocab.find(filter)
          .select('-_id -__v')
          .sort({ order: 1, createdAt: -1 })
          .lean()
          .exec();
      } else {
        list = [];
      }
    } else {
      const perLevel = await Promise.all(
        this.hskCollections.getAllLevels().map((lv) =>
          lv.vocab
            .find(filter)
            .select('-_id -__v')
            .sort({ order: 1, createdAt: -1 })
            .lean()
            .exec(),
        ),
      );
      list = perLevel.flat();
    }

    if (query.search && query.search.trim()) {
      const q = normalizeSearch(query.search.trim());
      list = list.filter(
        (w) =>
          (w.hanzi || '').includes(q) ||
          normalizeSearch(w.pinyin).includes(q) ||
          normalizeSearch(w.hanviet).includes(q) ||
          normalizeSearch(w.meaning).includes(q) ||
          normalizeSearch(w.english).includes(q),
      );
    }

    return list;
  }

  async findOne(id: string) {
    const found = await this.hskCollections.findVocabById(id);
    if (!found) {
      throw new NotFoundException(`Vocab word "${id}" not found`);
    }
    return found.doc;
  }

  async create(dto: CreateVocabDto) {
    const lv = this.hskCollections.getLevel(dto.level);
    let lessonId = dto.lessonId;
    if (!lessonId) {
      const defaultLesson = await lv.lessons.findOne().sort({ order: 1 }).lean().exec();
      lessonId = defaultLesson ? defaultLesson.id : `hsk${dto.level}-l1`;
    }

    const doc = await lv.vocab.create({
      id: `cw_${Date.now()}`,
      lessonId,
      hanzi: dto.hanzi.trim(),
      pinyin: dto.pinyin.trim(),
      hanviet: (dto.hanviet || '').trim().toUpperCase() || 'TỰ THÊM',
      english: (dto.english || '').trim(),
      meaning: dto.meaning.trim(),
      pos: (dto.pos || '').trim() || 'Từ vựng',
      level: dto.level,
      status: 'new',
      custom: true,
      note: (dto.note || '').trim() || 'Từ vựng cá nhân do bạn tự thêm.',
      exampleZh: (dto.exampleZh || '').trim() || dto.hanzi.trim(),
      exampleVi: (dto.exampleVi || '').trim() || dto.meaning.trim(),
      order: -Date.now(),
    });

    const profile = await this.profileService.addXp(10);
    return { word: doc.toObject(), profile };
  }

  async update(id: string, dto: UpdateVocabDto) {
    const found = await this.hskCollections.findVocabById(id);
    if (!found) {
      throw new NotFoundException(`Vocab word "${id}" not found`);
    }

    const cleanPatch: Record<string, any> = { ...dto };
    if (typeof cleanPatch.hanzi === 'string') cleanPatch.hanzi = cleanPatch.hanzi.trim();
    if (typeof cleanPatch.pinyin === 'string') cleanPatch.pinyin = cleanPatch.pinyin.trim();
    if (typeof cleanPatch.hanviet === 'string') {
      cleanPatch.hanviet = cleanPatch.hanviet.trim().toUpperCase();
    }
    if (typeof cleanPatch.meaning === 'string') cleanPatch.meaning = cleanPatch.meaning.trim();
    if (typeof cleanPatch.english === 'string') cleanPatch.english = cleanPatch.english.trim();
    if (typeof cleanPatch.pos === 'string') cleanPatch.pos = cleanPatch.pos.trim();
    if (typeof cleanPatch.note === 'string') cleanPatch.note = cleanPatch.note.trim();
    if (typeof cleanPatch.exampleZh === 'string') cleanPatch.exampleZh = cleanPatch.exampleZh.trim();
    if (typeof cleanPatch.exampleVi === 'string') cleanPatch.exampleVi = cleanPatch.exampleVi.trim();

    // Move document cleanly across HSK1..HSK6 databases if level changed
    if (dto.level && dto.level !== found.level) {
      const targetLevel = this.hskCollections.getLevel(dto.level);
      const { _id, __v, ...rest } = found.doc;
      const merged = {
        ...rest,
        ...cleanPatch,
        level: dto.level,
      };
      await targetLevel.vocab.findOneAndUpdate({ id }, { $set: merged }, { upsert: true }).exec();
      await found.models.vocab.deleteOne({ id }).exec();
      return merged;
    }

    const updated = await found.models.vocab
      .findOneAndUpdate({ id }, { $set: cleanPatch }, { new: true })
      .select('-_id -__v')
      .lean()
      .exec();
    return updated;
  }

  async batchUpdateStatus(ids: string[], status: 'mastered' | 'learning' | 'review' | 'new') {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (!uniqueIds.length) return { updatedCount: 0, status };

    const results = await Promise.all(
      this.hskCollections
        .getAllLevels()
        .map((lv) => lv.vocab.updateMany({ id: { $in: uniqueIds } }, { $set: { status } }).exec()),
    );
    const updatedCount = results.reduce((sum, r) => sum + (r.modifiedCount || 0), 0);
    return { updatedCount, status };
  }

  async batchRemove(ids: string[]) {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (!uniqueIds.length) return { deletedCount: 0 };

    const results = await Promise.all(
      this.hskCollections
        .getAllLevels()
        .map((lv) => lv.vocab.deleteMany({ id: { $in: uniqueIds } }).exec()),
    );
    const deletedCount = results.reduce((sum, r) => sum + (r.deletedCount || 0), 0);
    return { deletedCount };
  }

  async updateStatus(id: string, dto: UpdateVocabStatusDto) {
    const found = await this.hskCollections.findVocabById(id);
    if (!found) {
      throw new NotFoundException(`Vocab word "${id}" not found`);
    }

    const updated = await found.models.vocab
      .findOneAndUpdate({ id }, { $set: { status: dto.status } }, { new: true })
      .select('-_id -__v')
      .lean()
      .exec();

    let profile = null;
    if (dto.recordReview) {
      const xpMap: Record<string, number> = { review: 5, learning: 10, mastered: 20, new: 0 };
      const xpGain = xpMap[dto.status] || 0;
      profile = await this.profileService.recordReview(xpGain);
    }

    return { word: updated, profile };
  }

  async remove(id: string) {
    const found = await this.hskCollections.findVocabById(id);
    if (!found) {
      throw new NotFoundException(`Vocab word "${id}" not found`);
    }
    await found.models.vocab.deleteOne({ id }).exec();
    return { deleted: true, id };
  }
}
