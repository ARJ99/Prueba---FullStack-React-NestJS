import { AccountsRepository } from './accounts.repository.js';
import { TreeService } from './tree.service.js';
import { Account, AccountNature, AccountTreeNode } from './account.js';

function seed(
  repository: AccountsRepository,
  code: string,
  name: string,
  nature: AccountNature,
): void {
  repository.save({ code, name, nature });
}

function makeService(): { service: TreeService; repository: AccountsRepository } {
  const repository = new AccountsRepository();
  return { service: new TreeService(repository), repository };
}

/** Recolecta todos los códigos del árbol en orden de aparición. */
function collectCodes(nodes: AccountTreeNode[]): string[] {
  return nodes.flatMap((node) => [node.code, ...collectCodes(node.children)]);
}

function findByCode(nodes: AccountTreeNode[], code: string): AccountTreeNode | undefined {
  for (const node of nodes) {
    if (node.code === code) return node;
    const found = findByCode(node.children, code);
    if (found !== undefined) return found;
  }
  return undefined;
}

describe('TreeService', () => {
  it('returns [] for an empty repository', () => {
    const { service } = makeService();

    expect(service.execute()).toEqual([]);
  });

  it('builds the full nested chain from clases down to subcuentas', () => {
    const { service, repository } = makeService();
    seed(repository, '110505', 'Caja general', 'debito');
    seed(repository, '2', 'Pasivo', 'credito');
    seed(repository, '1105', 'Caja', 'debito');
    seed(repository, '1', 'Activo', 'debito');
    seed(repository, '110510', 'Caja menor', 'debito');
    seed(repository, '11', 'Disponible', 'debito');

    const tree = service.execute();

    expect(tree.map((node) => node.code)).toEqual(['1', '2']);

    const activo = findByCode(tree, '1') as AccountTreeNode;
    expect(activo.children.map((node) => node.code)).toEqual(['11']);

    const disponible = findByCode(tree, '11') as AccountTreeNode;
    expect(disponible.children.map((node) => node.code)).toEqual(['1105']);

    const caja = findByCode(tree, '1105') as AccountTreeNode;
    expect(caja.children.map((node) => node.code)).toEqual(['110505', '110510']);

    const pasivo = findByCode(tree, '2') as AccountTreeNode;
    expect(pasivo.children).toEqual([]);
  });

  it('sorts siblings by code regardless of insertion order', () => {
    const { service, repository } = makeService();
    seed(repository, '1', 'Activo', 'debito');
    seed(repository, '11', 'Disponible', 'debito');
    seed(repository, '1105', 'Caja', 'debito');
    seed(repository, '110510', 'Caja menor', 'debito'); // insertado antes
    seed(repository, '110505', 'Caja general', 'debito');

    const tree = service.execute();

    const caja = findByCode(tree, '1105') as AccountTreeNode;
    expect(caja.children.map((node) => node.code)).toEqual(['110505', '110510']);
    expect(collectCodes(tree)).toEqual(collectCodes(tree).slice().sort());
  });

  it('exposes code, name, nature and children on every node', () => {
    const { service, repository } = makeService();
    seed(repository, '1', 'Activo', 'debito');
    seed(repository, '11', 'Disponible', 'debito');
    seed(repository, '2', 'Pasivo', 'credito');

    const tree = service.execute();

    expect(tree).toEqual([
      {
        code: '1',
        name: 'Activo',
        nature: 'debito',
        children: [
          { code: '11', name: 'Disponible', nature: 'debito', children: [] },
        ],
      },
      {
        code: '2',
        name: 'Pasivo',
        nature: 'credito',
        children: [],
      },
    ]);
  });

  it('does not share node references with the stored accounts', () => {
    const { service, repository } = makeService();
    seed(repository, '1', 'Activo', 'debito');

    const tree = service.execute();
    const stored = repository.findByCode('1') as Account;

    expect(tree[0]).not.toBe(stored);
    tree[0].name = 'mutado';
    expect(repository.findByCode('1')?.name).toBe('Activo');
  });

  it('includes every seeded account exactly once, however deep the nesting', () => {
    const { service, repository } = makeService();
    seed(repository, '1', 'Activo', 'debito');
    seed(repository, '2', 'Pasivo', 'credito');
    seed(repository, '11', 'Disponible', 'debito');
    seed(repository, '12', 'Inversiones', 'debito');
    seed(repository, '1105', 'Caja', 'debito');
    seed(repository, '110505', 'Caja general', 'debito');
    seed(repository, '110510', 'Caja menor', 'debito');
    seed(repository, '1205', 'Fondos', 'debito');

    const tree = service.execute();
    const codes = collectCodes(tree);

    expect(codes).toHaveLength(repository.count());
    expect([...codes].sort()).toEqual(
      repository
        .findAll()
        .map((account) => account.code)
        .sort(),
    );
    expect(new Set(codes).size).toBe(codes.length);
  });
});
