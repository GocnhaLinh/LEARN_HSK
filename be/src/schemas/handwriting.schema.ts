import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type HandwritingDocument = HydratedDocument<Handwriting>;

@Schema({ timestamps: true, collection: 'handwriting' })
export class Handwriting {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true })
  img: string;

  @Prop({ required: true })
  caption: string;

  @Prop({ required: true })
  date: string;
}

export const HandwritingSchema = SchemaFactory.createForClass(Handwriting);
