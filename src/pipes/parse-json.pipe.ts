import { PipeTransform, Injectable } from '@nestjs/common';

@Injectable()
export class ParseJsonPipe implements PipeTransform {
  transform(value: any) {
    if (value?.options) {
      return {
        ...value,
        options: value.options.map((optionRaw) => JSON.parse(optionRaw)),
      };
    }
    return value;
  }
}
