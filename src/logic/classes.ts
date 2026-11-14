// Behinderungsklassen of an athlete and the class tree that supports the Einstufung.
import type { Athlete, Catalog, ClassId, DisabilityClass } from './types.ts';

/** Classes the evaluation uses: every matching class the examiner has not deactivated. */
export function activeClassIds(athlete: Pick<Athlete, 'classIds' | 'inactiveClassIds'>): ClassId[] {
  return athlete.classIds.filter((id) => !athlete.inactiveClassIds.includes(id));
}

export interface ClassBranch {
  main: DisabilityClass;
  subgroups: DisabilityClass[];
}

/** Main classes in catalog order, each with its subgroups — the structure to choose from. */
export function classTree(catalog: Pick<Catalog, 'classes'>): ClassBranch[] {
  return catalog.classes
    .filter((entry) => entry.parentId === undefined)
    .map((main) => ({
      main,
      subgroups: catalog.classes.filter((entry) => entry.parentId === main.id),
    }));
}
