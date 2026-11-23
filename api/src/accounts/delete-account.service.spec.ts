import { AccountNature } from './account.js';
import { AccountHasChildrenError, AccountNotFoundError } from './accounts.errors.js';
import { AccountsRepository } from './accounts.repository.js';
import { DeleteAccountService } from './delete-account.service.js';

function seed(
  repository: AccountsRepository,
  code: string,
  name: string,
  nature: AccountNature,
): void {
  repository.save({ code, name, nature });
}

describe('DeleteAccountService', () => {
  let repository: AccountsRepository;
  let service: DeleteAccountService;

  beforeEach(() => {
    repository = new AccountsRepository();
    service = new DeleteAccountService(repository);
  });

  it('elimina una cuenta hoja (subcuenta sin hijas)', () => {
    seed(repository, '1', 'Activos', 'debito');
    seed(repository, '11', 'Activos corrientes', 'debito');
    seed(repository, '1105', 'Efectivo', 'debito');
    seed(repository, '110505', 'Caja general', 'debito');

    const countBefore = repository.count();

    service.execute('110505');

    expect(repository.findByCode('110505')).toBeUndefined();
    expect(repository.count()).toBe(countBefore - 1);
  });

  it('rechaza eliminar una cuenta padre que tiene hijas', () => {
    seed(repository, '1', 'Activos', 'debito');
    seed(repository, '11', 'Activos corrientes', 'debito');
    seed(repository, '1105', 'Efectivo', 'debito');
    seed(repository, '110505', 'Caja general', 'debito');

    expect(() => service.execute('1105')).toThrow(AccountHasChildrenError);
    expect(repository.findByCode('1105')).toBeDefined();
  });

  it('rechaza eliminar una clase con descendientes', () => {
    seed(repository, '1', 'Activos', 'debito');
    seed(repository, '11', 'Activos corrientes', 'debito');
    seed(repository, '1105', 'Efectivo', 'debito');
    seed(repository, '110505', 'Caja general', 'debito');

    expect(() => service.execute('1')).toThrow(AccountHasChildrenError);
    expect(repository.findByCode('1')).toBeDefined();
  });

  it('rechaza eliminar un código inexistente sin alterar el catálogo', () => {
    seed(repository, '1', 'Activos', 'debito');
    seed(repository, '11', 'Activos corrientes', 'debito');
    seed(repository, '1105', 'Efectivo', 'debito');
    seed(repository, '110505', 'Caja general', 'debito');

    const countBefore = repository.count();

    expect(() => service.execute('99')).toThrow(AccountNotFoundError);
    expect(repository.count()).toBe(countBefore);
    expect(repository.findByCode('99')).toBeUndefined();
  });

  it('re-evalúa la hoja en cada llamada: tras borrar la subcuenta, su padre puede eliminarse', () => {
    seed(repository, '1', 'Activos', 'debito');
    seed(repository, '11', 'Activos corrientes', 'debito');
    seed(repository, '1105', 'Efectivo', 'debito');
    seed(repository, '110505', 'Caja general', 'debito');

    expect(() => service.execute('1105')).toThrow(AccountHasChildrenError);

    service.execute('110505');
    expect(() => service.execute('1105')).not.toThrow();
    expect(repository.findByCode('1105')).toBeUndefined();
  });
});
