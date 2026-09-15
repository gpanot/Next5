import { describe, expect, it } from 'vitest';
import { parseCsv, parseExportRows } from '../../../src/server/shopImport/exportFile';

describe('Seller Center export', () => {
  it('detects columns, merges SKU rows and keeps image URLs', () => {
    const csv = [
      'Instructions: fill in the rows below,,,,,',
      'Product ID,Product Name,Category,Seller SKU,Price,Main Image,Image 2',
      '1732,"Satin Slip Dress, Sage",Womenswear > Dresses,SSD-S,25.9,https://img.example/a.jpg,https://img.example/b.jpg',
      '1732,"Satin Slip Dress, Sage",Womenswear > Dresses,SSD-M,25.9,https://img.example/a.jpg,',
      ',Knit Two-Piece Set,,SET-1,$32.00,https://img.example/c.jpg,',
      ',No image row,,X-1,10,,',
    ].join('\r\n');
    const { products, missing } = parseExportRows(parseCsv(csv));
    expect(missing).toEqual([]);
    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({ externalId: '1732', title: 'Satin Slip Dress, Sage', category: 'dress', priceCents: 2590, imageUrls: ['https://img.example/a.jpg', 'https://img.example/b.jpg'] });
    expect(products[1]).toMatchObject({ externalId: 'SET-1', category: 'set', priceCents: 3200 });
  });

  it('reports missing columns', () => {
    expect(parseExportRows([['SKU', 'Price'], ['a', '1']]).missing).toEqual(['product name', 'image URL']);
  });
});
