export interface CartItemDetail {
  cartItemId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface CartSnapshot {
  cartId: string;
  outletId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  items: CartItemDetail[];
  subtotal: number;
  totalItems: number;
}

export interface AddCartItemData {
  productId: string;
  quantity: number;
}

/**
 * Public contract yang disediakan Cart Module untuk module lain.
 *
 * Cart bersifat per kasir per outlet (unique user + outlet) dan dibuat
 * lazily saat item pertama ditambahkan. Ownership cart (cart + cart_item)
 * berada di Cart Module; module lain tidak boleh mengakses repository-nya.
 *
 * Stock final baru dikurangi saat checkout oleh Transaction Module,
 * bukan pada saat menambahkan item ke cart.
 */
export interface CartPort {
  getCart(userId: string, outletId: string): Promise<CartSnapshot | null>;

  addItem(
    userId: string,
    outletId: string,
    data: AddCartItemData,
  ): Promise<CartSnapshot>;

  updateItemQuantity(
    userId: string,
    outletId: string,
    cartItemId: string,
    quantity: number,
  ): Promise<CartSnapshot>;

  removeItem(
    userId: string,
    outletId: string,
    cartItemId: string,
  ): Promise<CartSnapshot>;

  clearCart(userId: string, outletId: string): Promise<CartSnapshot>;

  getCartForCheckout(
    userId: string,
    outletId: string,
  ): Promise<CartSnapshot | null>;

  clearAfterCheckout(userId: string, outletId: string): Promise<void>;
}
