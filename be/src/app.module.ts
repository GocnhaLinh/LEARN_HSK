import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { DatabaseModule } from "./database/database.module";
import { BackupModule } from "./modules/backup/backup.module";
import { BootstrapModule } from "./modules/bootstrap/bootstrap.module";
import { CoursesModule } from "./modules/courses/courses.module";
import { ExercisesModule } from "./modules/exercises/exercises.module";
import { HandwritingModule } from "./modules/handwriting/handwriting.module";
import { HealthModule } from "./modules/health/health.module";
import { LessonsModule } from "./modules/lessons/lessons.module";
import { NotesModule } from "./modules/notes/notes.module";
import { ProfileModule } from "./modules/profile/profile.module";
import { SeedModule } from "./modules/seed/seed.module";
import { VocabModule } from "./modules/vocab/vocab.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>("MONGODB_URI", "mongodb://127.0.0.1:27017/HSK"),
        maxPoolSize: 5,
        minPoolSize: 1,
        maxConnecting: 2,
        family: 4,
        autoSelectFamily: false,
        autoCreate: false,
        autoIndex: false,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      }),
    }),
    DatabaseModule,
    HealthModule,
    BootstrapModule,
    SeedModule,
    ProfileModule,
    CoursesModule,
    LessonsModule,
    VocabModule,
    ExercisesModule,
    NotesModule,
    HandwritingModule,
    BackupModule,
  ],
})
export class AppModule {}
