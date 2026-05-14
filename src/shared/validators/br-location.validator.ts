import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import axios from 'axios';

@ValidatorConstraint({ name: 'BrLocation', async: true })
export class BrLocationValidator implements ValidatorConstraintInterface {
  async validate(city: string, args: ValidationArguments) {
    const state = (args.object as any).state;

    if (!city) return false;

    if (!state) return true;

    try {
      const res = await axios.get<any[]>(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state}/municipios`,
      );

      return res.data.some(
        (c) => c.nome.toLowerCase() === city.toLowerCase(),
      );
    } catch {
      return true;
    }
  }

  defaultMessage() {
    return 'Cidade não existe para o estado informado.';
  }
}
