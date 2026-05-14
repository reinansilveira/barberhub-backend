import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import axios from 'axios';

export function IsBrState(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        async validate(value: string) {
          if (!value) return false;

          try {
            await axios.get(
              `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${value}`,
            );
            return true;
          } catch {
            return false;
          }
        },

        defaultMessage(_args: ValidationArguments) {
          return 'Estado (UF) inválido.';
        },
      },
    });
  };
}
