// FIX: Removed circular import of 'Product'. The interface is defined in this file.

export interface Comment {
  id: number;
  author: string;
  avatar: string; // URL to avatar image
  rating: number;
  text: string;
  date: string; // ISO string
}

export interface Product {
  id: number;
  name: {
    ar: string;
    en: string;
  };
  category: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  images: string[];
  stock: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  soldCount: number;
  comments: Comment[];
}

export interface CartItem extends Product {
  quantity: number;
}

export interface UserProfile {
  fullName: string;
  phone: string;
  city: string;
  address: string;
  avatarUrl: string;
}

export interface OrderItem {
  productId: number;
  name: {
    ar: string;
    en: string;
  };
  image: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  date: string; // ISO string
  status: 'Delivered' | 'Processing' | 'Cancelled';
  totalAmount: number;
  items: OrderItem[];
}

export interface CommentWithProductInfo {
  productId: number;
  comment: Comment;
}