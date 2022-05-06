import { forwardRef, Module } from '@nestjs/common';

import { VotesService } from './votes.service';
import { VotesController } from './votes.controller';
import { PollsModule } from 'src/polls/polls.module';

@Module({
  imports: [forwardRef(() => PollsModule)],
  providers: [VotesService],
  exports: [VotesService],
  controllers: [VotesController],
})
export class VotesModule {}
