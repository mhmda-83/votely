import * as multer from 'multer';
import * as path from 'path';

export const coverStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(__dirname, '..', '..', 'covers'));
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    cb(
      null,
      req.user.id +
        '-' +
        timestamp +
        '.' +
        file.originalname.split('.')[file.originalname.split('.').length - 1],
    );
  },
});
