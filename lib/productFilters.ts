type ProductLike = {
  sections?: string[];
  stockStatus?: string;
  inventory?: number;
};

/** Бэлэн: sections-д "Бэлэн" эсвэл stockStatus in-stock */
export function isReadyProduct(p: ProductLike): boolean {
  if (Array.isArray(p.sections) && p.sections.includes('Бэлэн')) return true;
  return p.stockStatus === 'in-stock';
}

/** Захиалга: бэлэн биш + (sections Захиалга эсвэл pre-order) */
export function isPreOrderProduct(p: ProductLike): boolean {
  if (isReadyProduct(p)) return false;
  if (Array.isArray(p.sections) && p.sections.includes('Захиалга')) return true;
  return p.stockStatus === 'pre-order';
}

export function buildSectionMongoQuery(section: string): Record<string, unknown> | null {
  if (section === 'Бэлэн') {
    return {
      $or: [{ sections: 'Бэлэн' }, { stockStatus: 'in-stock' }],
    };
  }
  if (section === 'Захиалга') {
    return {
      stockStatus: { $ne: 'in-stock' },
      $or: [{ sections: 'Захиалга' }, { stockStatus: 'pre-order' }],
    };
  }
  if (section) {
    return { sections: section };
  }
  return null;
}
