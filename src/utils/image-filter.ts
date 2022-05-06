import { BadRequestException } from '@nestjs/common';
import * as path from 'path';

export const imageFilter = function (req, file, callback) {
  const ext = path.extname(file.originalname);
  if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
    return callback(new BadRequestException('only images are allowed'), false);
  }
  callback(null, true);
};
