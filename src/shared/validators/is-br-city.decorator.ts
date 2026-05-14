import { registerDecorator } from 'class-validator';
import { BrLocationValidator } from './br-location.validator';

export function IsBrCity() {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      validator: BrLocationValidator,
    });
  };
}
