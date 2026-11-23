import {
  DuplicateAccountCodeError,
  InvalidAccountCodeError,
  InvalidAccountNameError,
  NatureRequiredError,
  ParentAccountNotFoundError,
} from './accounts.errors.js';
import { AccountsRepository } from './accounts.repository.js';
import { CreateAccountService } from './create-account.service.js';

describe('CreateAccountService', () => {
  let repository: AccountsRepository;
  let service: CreateAccountService;

  beforeEach(() => {
    repository = new AccountsRepository();
    service = new CreateAccountService(repository);
  });

  describe('creación válida', () => {
    it('crea una clase (1 dígito) con la naturaleza explícita', () => {
      const account = service.execute({ code: '1', name: 'Activos', nature: 'debito' });

      expect(account).toEqual({ code: '1', name: 'Activos', nature: 'debito' });
    });

    it('crea una subcuenta que hereda la naturaleza del padre', () => {
      service.execute({ code: '1', name: 'Activos', nature: 'debito' });
      service.execute({ code: '11', name: 'Activos corrientes' });
      service.execute({ code: '1105', name: 'Bancos' });

      const account = service.execute({ code: '110505', name: 'Banco principal' });

      expect(account).toEqual({ code: '110505', name: 'Banco principal', nature: 'debito' });
    });

    it('crea cuentas de todos los niveles intermedios', () => {
      service.execute({ code: '2', name: 'Pasivos', nature: 'credito' });

      const grupo = service.execute({ code: '21', name: 'Pasivos corrientes' });
      const cuenta = service.execute({ code: '2105', name: 'Proveedores' });

      expect(grupo.nature).toBe('credito');
      expect(cuenta.nature).toBe('credito');
    });

    it('recorta los espacios del nombre al guardar', () => {
      const account = service.execute({ code: '1', name: '  Activos  ', nature: 'debito' });

      expect(account.name).toBe('Activos');
    });

    it('ignora la naturaleza recibida en niveles inferiores (hereda la del padre)', () => {
      service.execute({ code: '1', name: 'Activos', nature: 'debito' });
      service.execute({ code: '11', name: 'Activos corrientes' });

      const account = service.execute({
        code: '1105',
        name: 'Bancos',
        nature: 'credito',
      });

      expect(account.nature).toBe('debito');
    });
  });

  describe('código inválido', () => {
    it('rechaza códigos no numéricos', () => {
      expect(() => service.execute({ code: '11a5', name: 'Bancos' })).toThrow(
        InvalidAccountCodeError,
      );
    });

    it('rechaza códigos con longitud de nivel inválida (3 y 5 dígitos)', () => {
      expect(() => service.execute({ code: '110', name: 'X' })).toThrow(
        InvalidAccountCodeError,
      );
      expect(() => service.execute({ code: '11050', name: 'X' })).toThrow(
        InvalidAccountCodeError,
      );
    });

    it('rechaza código vacío', () => {
      expect(() => service.execute({ code: '', name: 'X' })).toThrow(
        InvalidAccountCodeError,
      );
    });
  });

  describe('nombre inválido', () => {
    it('rechaza nombre vacío', () => {
      expect(() => service.execute({ code: '1', name: '', nature: 'debito' })).toThrow(
        InvalidAccountNameError,
      );
    });

    it('rechaza nombre con solo espacios', () => {
      expect(() => service.execute({ code: '1', name: '   ', nature: 'debito' })).toThrow(
        InvalidAccountNameError,
      );
    });
  });

  describe('naturaleza', () => {
    it('rechaza una clase sin naturaleza', () => {
      expect(() => service.execute({ code: '1', name: 'Activos' })).toThrow(
        NatureRequiredError,
      );
    });

    it('rechaza una clase con una naturaleza desconocida', () => {
      expect(() =>
        service.execute({ code: '1', name: 'Activos', nature: 'foo' as never }),
      ).toThrow(NatureRequiredError);
    });
  });

  describe('unicidad', () => {
    it('rechaza un código duplicado', () => {
      service.execute({ code: '1', name: 'Activos', nature: 'debito' });

      expect(() =>
        service.execute({ code: '1', name: 'Otra clase', nature: 'credito' }),
      ).toThrow(DuplicateAccountCodeError);
    });

    it('no guarda una segunda cuenta cuando el código está duplicado', () => {
      service.execute({ code: '1', name: 'Activos', nature: 'debito' });

      expect(() => service.execute({ code: '1', name: 'Otra', nature: 'credito' })).toThrow(
        DuplicateAccountCodeError,
      );
      expect(repository.count()).toBe(1);
    });
  });

  describe('padre inexistente', () => {
    it('rechaza una cuenta cuyo padre no existe', () => {
      service.execute({ code: '1', name: 'Activos', nature: 'debito' });

      expect(() => service.execute({ code: '1105', name: 'Bancos' })).toThrow(
        ParentAccountNotFoundError,
      );
    });

    it('rechaza un grupo cuya clase no existe', () => {
      expect(() => service.execute({ code: '11', name: 'Activos corrientes' })).toThrow(
        ParentAccountNotFoundError,
      );
    });
  });

  describe('persistencia', () => {
    it('guarda la cuenta en el repositorio', () => {
      const account = service.execute({ code: '1', name: 'Activos', nature: 'debito' });

      expect(repository.findByCode('1')).toEqual(account);
      expect(repository.count()).toBe(1);
    });
  });
});
