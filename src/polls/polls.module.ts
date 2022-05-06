import { forwardRef, Module } from '@nestjs/common';

import { PollsService } from './polls.service';
import { PollsController } from './polls.controller';
import { VotesModule } from 'src/votes/votes.module';

@Module({
  imports: [forwardRef(() => VotesModule)],
  providers: [PollsService],
  controllers: [PollsController],
  exports: [PollsService],
})
export class PollsModule {}
