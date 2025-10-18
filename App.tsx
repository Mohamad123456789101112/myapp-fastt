import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Product, CartItem, UserProfile, Order, Comment, CommentWithProductInfo } from './types';
import { PRODUCTS, translations, AVATARS, MOCKED_ORDERS, MOTIVATIONAL_MESSAGES } from './constants';
import { HomeIcon, SearchIcon, CartIcon, UserIcon, MenuIcon, SunIcon, MoonIcon, StarIcon, ChevronDownIcon, XIcon, SparklesIcon, SettingsIcon, TrashIcon, CameraIcon, EyeIcon, EyeOffIcon, PencilIcon, BoxIcon, ChevronRightIcon, LogoutIcon } from './components/icons';

const formatCurrency = (price: number | undefined, lang: 'ar' | 'en') => {
  if (typeof price !== 'number') return '';
  const formattedPrice = price.toFixed(2);
  if (lang === 'ar') {
    return `${formattedPrice} ج.م`;
  }
  return `EGP ${formattedPrice}`;
};

// CUSTOM HOOK for data persistence
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      // If item exists and is not an empty array for product seeding, use it.
      if (item) {
          const parsed = JSON.parse(item);
          if (Array.isArray(parsed) && parsed.length === 0 && key === 'products') {
              // If stored products are empty, fall back to initial value to re-seed.
              return initialValue;
          }
          return parsed;
      }
      return initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      const valueToStore = JSON.stringify(storedValue);
      window.localStorage.setItem(key, valueToStore);
    } catch (error) {
      console.error(`Error saving ${key} to localStorage`, error);
      if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22)) {
         // Optionally alert the user that storage is full
         alert("Local storage is full. Please clear some space to save new items.");
      }
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}


// HELPER & UI COMPONENTS

const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width = Math.round((width * maxWidth) / height);
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

const Toast: React.FC<{ message: string; visible: boolean; lang: 'ar' | 'en' }> = ({ message, visible, lang }) => {
  return (
    <div 
      className={`fixed top-5 ${lang === 'ar' ? 'left-5' : 'right-5'} transition-all duration-300 ease-out z-[100] ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}
      aria-live="polite"
    >
      <div className="flex items-center bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-4 border-l-4 border-green-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p className="mx-3 text-gray-700 dark:text-gray-200 font-semibold">{message}</p>
      </div>
    </div>
  );
};

const MotivationalToast: React.FC<{ message: string; visible: boolean; title: string }> = ({ message, visible, title }) => {
    return (
        <div className={`fixed bottom-24 lg:bottom-5 left-1/2 -translate-x-1/2 w-[90vw] max-w-md transition-all duration-500 ease-in-out z-[100] ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} aria-live="polite">
            <div className="flex items-start bg-indigo-50 dark:bg-gray-800 rounded-lg shadow-xl p-4 border-l-4 border-indigo-400">
                <SparklesIcon className="h-6 w-6 text-indigo-500 flex-shrink-0" />
                <div className="mx-3">
                    <p className="font-bold text-indigo-800 dark:text-indigo-300">{title}</p>
                    <p className="text-sm text-indigo-700 dark:text-indigo-200">{message}</p>
                </div>
            </div>
        </div>
    );
};

const ImageViewerModal: React.FC<{ imageUrl: string; isOpen: boolean; onClose: () => void }> = ({ imageUrl, isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[101] flex justify-center items-center p-4" onClick={onClose}>
            <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 z-10">
                <XIcon className="w-8 h-8" />
            </button>
            <div className="relative max-w-full max-h-full" onClick={e => e.stopPropagation()}>
                <img src={imageUrl} alt="Full screen view" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
            </div>
        </div>
    );
};

const RatingStars: React.FC<{ rating: number; reviewCount?: number; lang: 'ar' | 'en' }> = ({ rating, reviewCount, lang }) => {
  return (
    <div className="flex items-center">
      <div className={`flex items-center ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
        {[...Array(5)].map((_, i) => (
          <StarIcon key={i} className={`h-5 w-5 ${i < Math.round(rating) ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
        ))}
      </div>
      {typeof reviewCount !== 'undefined' && <span className="text-xs text-gray-500 dark:text-gray-400 mx-2">({reviewCount})</span>}
    </div>
  );
};

const ProductCard: React.FC<{ product: Product; t: any; lang: 'ar' | 'en'; onAddToCart: (product: Product) => void; onViewProduct: (productId: number) => void; index: number; }> = ({ product, t, lang, onAddToCart, onViewProduct, index }) => {
  const isRTL = lang === 'ar';
  return (
    <div style={{ animationDelay: `${index * 75}ms` }} className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 product-card-enter ${product.stock === 0 ? 'opacity-60 grayscale' : ''}`}>
      <div className="relative overflow-hidden cursor-pointer" onClick={() => onViewProduct(product.id)}>
        <img src={product.images[0]} alt={product.name[lang]} className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300" />
        {product.originalPrice && (
          <div className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full`}>
            {`-${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%`}
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate cursor-pointer" onClick={() => onViewProduct(product.id)}>{product.name[lang]}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{product.category[lang]}</p>
        <RatingStars rating={product.rating} reviewCount={product.reviewCount} lang={lang} />
        <div className="flex items-baseline my-3">
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(product.price, lang)}</span>
          {product.originalPrice && <span className="text-sm text-gray-400 line-through mx-2">{formatCurrency(product.originalPrice, lang)}</span>}
        </div>
        <div className="min-h-[1.5rem] mb-2">
            {product.stock > 0 ? (
                <p className={`text-sm font-semibold ${
                    product.stock <= 10 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'
                }`}>
                    {product.stock <= 10 ? t.onlyStockLeft.replace('{stock}', product.stock) : t.inStock}
                </p>
            ) : (
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {t.outOfStock}
                </p>
            )}
        </div>
        <button
            onClick={() => onAddToCart(product)}
            disabled={product.stock === 0}
            className={`mt-auto w-full text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 ${
                product.stock === 0
                ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                : 'gradient-btn'
            }`}
        >
          {product.stock === 0 ? t.outOfStock : t.addToCart}
        </button>
      </div>
    </div>
  );
};

const FormInputComponent: React.FC<{label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; error?: string; type?: string;}> = ({label, value, onChange, error, type = 'text'}) => (
    <div>
       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
       <input type={type} value={value} onChange={onChange} className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 border-transparent rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
       {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
   </div>
);

const MobileHeader: React.FC<{
  t: any;
  lang: 'ar' | 'en';
  theme: 'light' | 'dark';
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  toggleLanguage: () => void;
  toggleTheme: () => void;
  setPage: (page: string) => void;
}> = ({ t, lang, theme, searchQuery, setSearchQuery, toggleLanguage, toggleTheme, setPage }) => {
  return (
    <header className="lg:hidden bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-sm sticky top-0 z-40 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <h1 onClick={() => setPage('home')} className="text-xl font-black text-indigo-600 dark:text-indigo-400 cursor-pointer whitespace-nowrap">{t.brandName}</h1>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <button onClick={toggleLanguage} className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1 rounded-md">
            {lang === 'ar' ? t.english : t.arabic}
          </button>
          <button onClick={toggleTheme} className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded-md">
            {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
          </button>
        </div>
      </div>
      <div className="mt-3">
        <div className="relative">
          <input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-lg py-2 ps-10 pe-4 text-sm" />
          <div className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3">
            <SearchIcon className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    </header>
  );
};

const Header: React.FC<{
  t: any;
  lang: 'ar' | 'en';
  theme: 'light' | 'dark';
  cartCount: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (category: string) => void;
  toggleLanguage: () => void;
  toggleTheme: () => void;
  setPage: (page: string) => void;
  products: Product[];
  profile: UserProfile | null;
  isProfileGlowing: boolean;
}> = ({ t, lang, theme, cartCount, searchQuery, setSearchQuery, setActiveCategory, toggleLanguage, toggleTheme, setPage, products, profile, isProfileGlowing }) => {
  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category.en)))], [products]);
  
  const getCategoryName = (catEn: string) => {
    if (catEn === 'All') return t.allCategories;
    const product = products.find(p => p.category.en === catEn);
    return product ? product.category[lang] : catEn;
  };

  return (
    <header className="bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-sm sticky top-0 z-40 hidden lg:block">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-8 rtl:space-x-reverse">
          <h1 onClick={() => setPage('home')} className="text-2xl font-black text-indigo-600 dark:text-indigo-400 cursor-pointer">{t.brandName}</h1>
          <div className="relative group">
            <button className="flex items-center text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400">
              {t.categories}
              <ChevronDownIcon className="w-4 h-4 ms-1" />
            </button>
            <div className="absolute ltr:left-0 rtl:right-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-transparent dark:border-gray-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-10">
                {categories.map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-700">{getCategoryName(cat)}</button>
                ))}
            </div>
          </div>
        </div>
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent rounded-lg py-2 ps-10 pe-4"/>
            <div className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3">
              <SearchIcon className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <button onClick={toggleLanguage} className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
            {lang === 'ar' ? t.english : t.arabic}
          </button>
          <button onClick={toggleTheme} className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
            {theme === 'light' ? <MoonIcon className="w-6 h-6"/> : <SunIcon className="w-6 h-6"/>}
          </button>
          <button onClick={() => setPage('cart')} className="relative text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
            <CartIcon className="w-6 h-6" />
            {cartCount > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{cartCount}</span>}
          </button>
           <button onClick={() => setPage('profile')} className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
             {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Profile" className={`w-8 h-8 rounded-full object-cover ring-2 ring-offset-2 ring-offset-white dark:ring-offset-black ring-indigo-500 ${isProfileGlowing ? 'profile-glow' : ''}`} />
              ) : (
                <UserIcon className="w-6 h-6" />
              )}
          </button>
          <button onClick={() => setPage('settings')} className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">
            <SettingsIcon className="w-6 h-6" />
          </button>
        </div>
      </nav>
    </header>
  );
};

const BottomNav: React.FC<{ t: any; cartCount: number; setPage: (page: string) => void; currentPage: string; profile: UserProfile | null; isProfileGlowing: boolean; }> = ({ t, cartCount, setPage, currentPage, profile, isProfileGlowing }) => {
  const navItems: {id: string; icon: React.FC<any>; label?: string; avatar?: string | null;}[] = [
    { id: 'home', icon: HomeIcon, label: t.home },
    { id: 'cart', icon: CartIcon, label: t.cart },
    { id: 'profile', icon: UserIcon, label: t.account, avatar: profile?.avatarUrl },
    { id: 'settings', icon: SettingsIcon },
  ];
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-black/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map(item => (
          <button key={item.id} onClick={() => setPage(item.id)} className={`flex flex-col items-center justify-center space-y-1 w-full ${currentPage === item.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
            <div className="relative">
               {item.avatar ? (
                <img src={item.avatar} alt={item.label || item.id} className={`w-7 h-7 rounded-full object-cover ${item.id === 'profile' && isProfileGlowing ? 'profile-glow' : ''}`} />
              ) : (
                <item.icon className="w-6 h-6" />
              )}
              {item.id === 'cart' && cartCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">{cartCount}</span>
              )}
            </div>
            {item.label && <span className="text-xs font-medium">{item.label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

// PAGE COMPONENTS

const HeroCarousel: React.FC<{ products: Product[]; t: any; lang: 'ar' | 'en'; onViewProduct: (productId: number) => void; }> = ({ products, t, lang, onViewProduct }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goToPrevious = () => {
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? products.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const goToNext = useCallback(() => {
        const isLastSlide = currentIndex === products.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    }, [currentIndex, products.length]);
    
    const goToSlide = (slideIndex: number) => {
        setCurrentIndex(slideIndex);
    };

    useEffect(() => {
        if (products.length > 1) {
            const slideInterval = setInterval(goToNext, 5000);
            return () => clearInterval(slideInterval);
        }
    }, [goToNext, products.length]);
    
    if (products.length === 0) {
        return null;
    }
    
    const isRTL = lang === 'ar';

    return (
        <div className="h-64 md:h-96 rounded-2xl overflow-hidden relative group bg-gray-200 dark:bg-gray-800">
            <div className="w-full h-full relative">
                {products.map((product, index) => {
                    const slideOffset = index - currentIndex;
                    const transformValue = `translateX(${isRTL ? -slideOffset * 100 : slideOffset * 100}%)`;

                    return (
                        <div
                            key={product.id}
                            className="w-full h-full absolute top-0 left-0 transition-transform duration-700 ease-in-out bg-cover bg-center"
                            style={{
                                backgroundImage: `url(${product.images[0]})`,
                                willChange: 'transform'
                            }}
                        >
                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white text-center p-4">
                                <h2 className="text-3xl md:text-5xl font-black mb-2 drop-shadow-lg">{product.name[lang]}</h2>
                                <p className="text-lg md:text-xl mb-4 drop-shadow-md">{product.category[lang]}</p>
                                <button onClick={() => onViewProduct(product.id)} className="gradient-btn text-white font-bold py-2 px-6 rounded-lg transition-transform duration-300 hover:scale-105 flex items-center justify-center gap-2">
                                    {t.buyNow}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {products.length > 1 && (
                <>
                    {/* Left Arrow */}
                    <button onClick={goToPrevious} className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-5' : 'left-5'} text-white bg-black/30 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           {isRTL ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />}
                        </svg>
                    </button>
                    {/* Right Arrow */}
                     <button onClick={goToNext} className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-5' : 'right-5'} text-white bg-black/30 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {isRTL ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />}
                        </svg>
                    </button>
                    <div className="absolute bottom-5 right-0 left-0">
                        <div className="flex items-center justify-center gap-2">
                            {products.map((_, slideIndex) => (
                                <button 
                                    key={slideIndex} 
                                    onClick={() => goToSlide(slideIndex)}
                                    className={`transition-all w-2 h-2 bg-white rounded-full ${currentIndex === slideIndex ? 'p-1.5' : 'bg-opacity-50'}`}
                                    aria-label={`Go to slide ${slideIndex + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};


const CategoryFilter: React.FC<{ t: any; lang: 'ar' | 'en'; activeCategory: string; setActiveCategory: (category: string) => void; products: Product[]; }> = ({ t, lang, activeCategory, setActiveCategory, products }) => {
    const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category.en)))], [products]);

    const getCategoryName = (catEn: string) => {
        if (catEn === 'All') return t.allCategories;
        const product = products.find(p => p.category.en === catEn);
        return product ? product.category[lang] : catEn;
    };
    
    return (
        <div className="flex space-x-2 rtl:space-x-reverse overflow-x-auto pb-3 -mx-4 px-4">
            {categories.map(category => (
                <button 
                    key={category} 
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 rounded-full font-semibold text-sm transition-colors whitespace-nowrap ${
                        activeCategory === category 
                        ? 'gradient-btn text-white' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                >
                    {getCategoryName(category)}
                </button>
            ))}
        </div>
    );
};


const HomePage: React.FC<{ products: Product[]; allProducts: Product[]; t: any; lang: 'ar' | 'en'; onAddToCart: (product: Product) => void; onViewProduct: (productId: number) => void; activeCategory: string; setActiveCategory: (category: string) => void; }> = ({ products, allProducts, t, lang, onAddToCart, onViewProduct, activeCategory, setActiveCategory }) => {
  const bestSellers = allProducts.filter(p => p.isBestSeller);
  
  return (
    <div className="space-y-12">
      {allProducts.length > 0 && (
          <HeroCarousel 
              products={allProducts.slice(-5).reverse()} // Show 5 most recent products
              t={t} 
              lang={lang} 
              onViewProduct={onViewProduct} 
          />
      )}
      
      <CategoryFilter t={t} lang={lang} activeCategory={activeCategory} setActiveCategory={setActiveCategory} products={allProducts} />
      
      {products.length === 0 && allProducts.length > 0 ? (
          <div className="text-center py-20">
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">{lang === 'ar' ? 'لا توجد منتجات تطابق بحثك.' : 'No products match your search.'}</p>
          </div>
      ) : allProducts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">{lang === 'ar' ? 'لم يتم إضافة منتجات بعد. أضف منتجك الأول من الإعدادات!' : 'No products yet. Add your first product from settings!'}</p>
        </div>
      ) : (
        <>
          {activeCategory === 'All' && bestSellers.length > 0 && (
            <section>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-6">{t.bestsellers}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {bestSellers.map((product, index) => (
                  <ProductCard key={product.id} product={product} t={t} lang={lang} onAddToCart={onAddToCart} onViewProduct={onViewProduct} index={index} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-6">{activeCategory === 'All' ? t.newArrivals : products[0]?.category[lang] || t.newArrivals}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} t={t} lang={lang} onAddToCart={onAddToCart} onViewProduct={onViewProduct} index={index} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const ProductPage: React.FC<{ productId: number; products: Product[]; t: any; lang: 'ar' | 'en'; onAddToCart: (product: Product) => void; onSaveProduct: (product: Product) => void; profile: UserProfile | null; cartItems: CartItem[]; }> = ({ productId, products, t, lang, onAddToCart, onSaveProduct, profile, cartItems }) => {
    const product = products.find(p => p.id === productId);
    const [mainImage, setMainImage] = useState(product?.images[0]);
    const [isImageViewerOpen, setImageViewerOpen] = useState(false);
    
    const [newRating, setNewRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [newCommentText, setNewCommentText] = useState('');
    
    useEffect(() => {
        if (product && !mainImage) {
            setMainImage(product.images[0]);
        }
    }, [product, mainImage]);

    const quantityInCart = useMemo(() => cartItems.find(item => item.id === product?.id)?.quantity || 0, [cartItems, product?.id]);
    
    if (!product) {
        return <div>Product not found</div>;
    }

    const effectiveStock = product.stock - quantityInCart;
    const isEffectivelyOutOfStock = effectiveStock <= 0;

    const handleReviewSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newRating === 0 || !newCommentText.trim()) {
            // Basic validation
            alert("Please provide a rating and a comment.");
            return;
        }

        const newComment: Comment = {
            id: Date.now(),
            author: profile?.fullName || "Anonymous",
            avatar: profile?.avatarUrl || AVATARS[3],
            rating: newRating,
            text: newCommentText,
            date: new Date().toISOString(),
        };

        const totalRating = product.comments.reduce((sum, c) => sum + c.rating, 0) + newRating;
        const newReviewCount = product.reviewCount + 1;
        const newAverageRating = totalRating / newReviewCount;

        const updatedProduct: Product = {
            ...product,
            comments: [newComment, ...product.comments],
            rating: newAverageRating,
            reviewCount: newReviewCount,
        };
        onSaveProduct(updatedProduct);

        // Reset form
        setNewRating(0);
        setNewCommentText('');
    };
    
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="container mx-auto py-8">
            <ImageViewerModal imageUrl={mainImage || ''} isOpen={isImageViewerOpen} onClose={() => setImageViewerOpen(false)} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <div className={product.stock === 0 ? 'opacity-60 grayscale' : ''}>
                     <div className="relative cursor-pointer" onClick={() => setImageViewerOpen(true)}>
                        <img src={mainImage} alt={product.name[lang]} className="w-full rounded-2xl shadow-lg aspect-square object-cover" />
                         <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <SearchIcon className="w-12 h-12 text-white" />
                        </div>
                    </div>
                    <div className="flex space-x-2 rtl:space-x-reverse mt-4">
                        {product.images.map((img, index) => (
                            <img 
                                key={index} 
                                src={img} 
                                alt={`${product.name[lang]} ${index+1}`} 
                                className={`w-20 h-20 rounded-lg object-cover cursor-pointer border-2 transition-colors ${mainImage === img ? 'border-indigo-500' : 'border-transparent hover:border-gray-300'}`}
                                onClick={() => setMainImage(img)}
                            />
                        ))}
                    </div>
                </div>
                <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">{product.name[lang]}</h1>
                    <p className="text-lg text-gray-500 dark:text-gray-400 mb-4">{product.category[lang]}</p>
                    <div className="mb-4">
                        <RatingStars rating={product.rating} reviewCount={product.reviewCount} lang={lang} />
                    </div>
                    <div className="flex items-baseline my-4">
                        <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(product.price, lang)}</span>
                        {product.originalPrice && <span className="text-xl text-gray-400 line-through mx-3">{formatCurrency(product.originalPrice, lang)}</span>}
                    </div>
                    {product.soldCount > 0 && (
                      <div className="flex items-center text-sm text-amber-600 dark:text-amber-400 font-semibold mb-4 bg-amber-100 dark:bg-amber-900/50 px-3 py-1.5 rounded-full w-fit">
                          <SparklesIcon className="w-5 h-5 me-2" />
                          {t.sold.replace('{count}', product.soldCount)}
                      </div>
                    )}
                    <p className="text-gray-600 dark:text-gray-300 mb-6">{product.description[lang]}</p>
                     <div className="mb-4">
                        {isEffectivelyOutOfStock ? (
                            <p className="font-semibold text-red-600 dark:text-red-400">
                                {t.outOfStock}
                            </p>
                        ) : (
                            <p className={`font-semibold ${
                                effectiveStock <= 10 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'
                            }`}>
                                {effectiveStock <= 10 ? t.onlyStockLeft.replace('{stock}', effectiveStock) : t.inStock}
                            </p>
                        )}
                    </div>
                    <div className={`flex items-center space-x-4 rtl:space-x-reverse`}>
                        <button
                            onClick={() => onAddToCart(product)}
                            disabled={isEffectivelyOutOfStock}
                            className={`flex-1 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors duration-200 flex items-center justify-center gap-2 ${
                                isEffectivelyOutOfStock 
                                ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                                : 'gradient-btn'
                            }`}
                        >
                            {isEffectivelyOutOfStock ? t.outOfStock : t.addToCart}
                        </button>
                        <button
                            disabled={isEffectivelyOutOfStock}
                            className={`flex-1 font-bold py-3 px-6 rounded-lg text-lg transition-colors flex items-center justify-center gap-2 ${
                                isEffectivelyOutOfStock 
                                ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            {t.buyNow}
                        </button>
                    </div>
                </div>
            </div>
            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-6">{t.customerReviews}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm sticky top-24">
                            <h3 className="text-xl font-bold mb-4">{t.addAReview}</h3>
                            <form onSubmit={handleReviewSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.yourRating}</label>
                                    <div className="flex items-center" onMouseLeave={() => setHoverRating(0)}>
                                        {[...Array(5)].map((_, i) => (
                                            <button type="button" key={i} onClick={() => setNewRating(i + 1)} onMouseEnter={() => setHoverRating(i + 1)}>
                                                <StarIcon className={`h-8 w-8 transition-colors ${(hoverRating || newRating) > i ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <textarea value={newCommentText} onChange={e => setNewCommentText(e.target.value)} placeholder={t.yourComment} rows={4} className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 border-transparent rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                                </div>
                                <button type="submit" className="w-full gradient-btn text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2">{t.submitReview}</button>
                            </form>
                        </div>
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                        {product.comments.length > 0 ? (
                            product.comments.map(comment => (
                                <div key={comment.id} className="flex items-start space-x-4 rtl:space-x-reverse bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl">
                                    <img src={comment.avatar} alt={comment.author} className="w-12 h-12 rounded-full object-cover bg-gray-200 dark:bg-gray-700" />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-gray-800 dark:text-gray-100">{comment.author}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(comment.date)}</p>
                                            </div>
                                            <RatingStars rating={comment.rating} lang={lang} />
                                        </div>
                                        <p className="mt-2 text-gray-600 dark:text-gray-300">{comment.text}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-10">{t.noReviews}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const CartPage: React.FC<{ cartItems: CartItem[]; t: any; lang: 'ar' | 'en'; updateCartQuantity: (productId: number, quantity: number) => void; setPage: (page: string) => void; }> = ({ cartItems, t, lang, updateCartQuantity, setPage }) => {
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-6">{t.shoppingCart}</h1>
      {cartItems.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-900 dark:border dark:border-gray-800 rounded-2xl">
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">{t.emptyCart}</p>
          <button onClick={() => setPage('home')} className="gradient-btn text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2 mx-auto">
            {t.browseProducts}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map(item => (
              <div key={item.id} className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-sm">
                <img src={item.images[0]} alt={item.name[lang]} className="w-24 h-24 rounded-lg object-cover" />
                <div className="flex-grow mx-4">
                  <h3 className="font-bold text-gray-900 dark:text-white">{item.name[lang]}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(item.price, lang)}</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateCartQuantity(item.id, parseInt(e.target.value))}
                    min="1"
                    max={item.stock}
                    className="w-16 text-center bg-gray-100 dark:bg-gray-700 rounded-lg border-transparent focus:ring-indigo-500"
                  />
                  <button onClick={() => updateCartQuantity(item.id, 0)} className="text-gray-400 hover:text-red-500 mx-2">
                    <XIcon className="w-5 h-5"/>
                  </button>
                </div>
                <div className="w-24 text-center font-bold text-lg text-gray-900 dark:text-white">{formatCurrency(item.price * item.quantity, lang)}</div>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm h-fit">
            <h2 className="text-xl font-bold mb-4">{t.orderSummary}</h2>
            <div className="flex justify-between mb-2 text-gray-600 dark:text-gray-300">
              <span>{t.subtotal}</span>
              <span>{formatCurrency(subtotal, lang)}</span>
            </div>
            <div className="flex justify-between mb-4 text-gray-600 dark:text-gray-300">
              <span>{t.discounts}</span>
              <span>-{formatCurrency(0, lang)}</span>
            </div>
            <hr className="my-4 border-gray-200 dark:border-gray-700"/>
            <div className="flex justify-between font-bold text-xl mb-6">
              <span>{t.total}</span>
              <span>{formatCurrency(subtotal, lang)}</span>
            </div>
            <button onClick={() => setPage('checkout')} className="w-full gradient-btn text-white font-bold py-3 rounded-lg text-lg flex items-center justify-center gap-2">
              {t.checkout}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface ShippingDetails {
    fullName: string;
    phone: string;
    city: string;
    address: string;
}

const CheckoutPage: React.FC<{
    cartItems: CartItem[];
    t: any;
    lang: 'ar' | 'en';
    onPlaceOrder: (details: ShippingDetails) => void;
    setPage: (page: string) => void;
    profile: UserProfile | null;
}> = ({ cartItems, t, lang, onPlaceOrder, setPage, profile }) => {
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [city, setCity] = useState('');
    const [address, setAddress] = useState('');
    const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errors, setErrors] = useState<any>({});
    
    useEffect(() => {
        if (profile) {
            setFullName(profile.fullName);
            setPhone(profile.phone);
            setCity(profile.city);
            setAddress(profile.address);
        }
    }, [profile]);
    
    const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

    const handleGetLocation = () => {
        setLocationStatus('loading');
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocationStatus('success');
                    console.log('Lat:', position.coords.latitude, 'Lng:', position.coords.longitude);
                },
                () => {
                    setLocationStatus('error');
                }
            );
        }
    };

    const validate = () => {
        const newErrors: any = {};
        const phoneRegex = /^(010|011|012|015)\d{8}$/;
        if (!fullName) newErrors.fullName = t.requiredField;
        if (!phone) {
            newErrors.phone = t.requiredField;
        } else if (!phoneRegex.test(phone)) {
            newErrors.phone = t.phoneNumberInvalid;
        }
        if (!city) newErrors.city = t.requiredField;
        if (!address) newErrors.address = t.requiredField;
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onPlaceOrder({ fullName, phone, city, address });
        }
    };

    if (cartItems.length === 0) {
      // Redirect to home if cart is empty
      useEffect(() => {
        setPage('home');
      }, [setPage]);
      return null;
    }

    const renderLocationButton = () => {
        switch (locationStatus) {
            case 'loading':
                return <span className="text-sm text-indigo-500">{t.gettingLocation}</span>;
            case 'success':
                return <span className="text-sm text-green-500">{t.locationCaptured}</span>;
            case 'error':
                return <span className="text-sm text-red-500">{t.locationPermissionDenied}</span>;
            case 'idle':
            default:
                return (
                    <button type="button" onClick={handleGetLocation} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                        {t.useCurrentLocation}
                    </button>
                );
        }
    };

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-6">{t.checkoutPage}</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm">
                    <h2 className="text-xl font-bold mb-4">{t.shippingAddress}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <FormInputComponent label={t.fullName} value={fullName} onChange={e => setFullName(e.target.value)} error={errors.fullName} />
                        <FormInputComponent label={t.phoneNumber} value={phone} onChange={e => setPhone(e.target.value)} error={errors.phone} type="tel" />
                        <FormInputComponent label={t.city} value={city} onChange={e => setCity(e.target.value)} error={errors.city} />
                        <div>
                            <div className="flex justify-between items-center">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.addressDetails}</label>
                                {renderLocationButton()}
                            </div>
                            <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3} className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 border-transparent rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                        </div>
                        <div className="pt-4">
                            <button type="submit" className="w-full gradient-btn text-white font-bold py-3 rounded-lg text-lg flex items-center justify-center gap-2">{t.placeOrder}</button>
                        </div>
                    </form>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm h-fit">
                    <h2 className="text-xl font-bold mb-4">{t.orderSummary}</h2>
                     <div className="space-y-3 max-h-60 overflow-y-auto mb-4 pr-2">
                        {cartItems.map(item => (
                            <div key={item.id} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-300 truncate w-3/4">{item.name[lang]} (x{item.quantity})</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(item.price * item.quantity, lang)}</span>
                            </div>
                        ))}
                    </div>
                    <hr className="my-4 border-gray-200 dark:border-gray-700"/>
                    <div className="flex justify-between font-bold text-xl">
                        <span>{t.total}</span>
                        <span>{formatCurrency(subtotal, lang)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


const SettingsPage: React.FC<{ 
    t: any; 
    lang: 'ar' | 'en';
    onOpenAddProductModal: (product?: Product) => void;
    products: Product[];
    onDeleteProduct: (productId: number) => void;
    telegramToken: string;
    telegramChatId: string;
    onSaveTelegramSettings: (token: string, chatId: string) => void;
    onOpenEditCommentModal: (productId: number, comment: Comment) => void;
    onDeleteComment: (productId: number, commentId: number) => void;
}> = ({ t, lang, onOpenAddProductModal, products, onDeleteProduct, telegramToken, telegramChatId, onSaveTelegramSettings, onOpenEditCommentModal, onDeleteComment }) => {
    const [localToken, setLocalToken] = useState(telegramToken);
    const [localChatId, setLocalChatId] = useState(telegramChatId);
    const [isTokenVisible, setTokenVisible] = useState(false);
    const [isChatIdVisible, setChatIdVisible] = useState(false);


    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveTelegramSettings(localToken, localChatId);
    };

    return (
        <div className="container mx-auto py-8 space-y-8">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-6">{t.settings}</h1>
            
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-bold mb-4">{t.addProduct}</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">{t.addProductDescription || 'أضف منتجات جديدة إلى متجرك من هنا.'}</p>
                <button onClick={() => onOpenAddProductModal()} className="gradient-btn text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2">
                    {t.addProduct}
                </button>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-bold mb-4">{t.telegramIntegration}</h2>
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="relative">
                        <FormInputComponent label={t.telegramBotToken} value={localToken} onChange={e => setLocalToken(e.target.value)} type={isTokenVisible ? 'text' : 'password'} />
                         <button type="button" onClick={() => setTokenVisible(p => !p)} className={`absolute top-8 ${lang === 'ar' ? 'left-3' : 'right-3'} text-gray-500 hover:text-gray-700 dark:hover:text-gray-300`}>
                            {isTokenVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                    </div>
                     <div className="relative">
                        <FormInputComponent label={t.telegramChatId} value={localChatId} onChange={e => setLocalChatId(e.target.value)} type={isChatIdVisible ? 'text' : 'password'} />
                        <button type="button" onClick={() => setChatIdVisible(p => !p)} className={`absolute top-8 ${lang === 'ar' ? 'left-3' : 'right-3'} text-gray-500 hover:text-gray-700 dark:hover:text-gray-300`}>
                            {isChatIdVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                    </div>
                    <div>
                        <button type="submit" className="gradient-btn text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2">
                            {t.saveSettings}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-bold mb-4">{t.manageProducts}</h2>
                <div className="space-y-4">
                    {products.length > 0 ? products.map(product => (
                        <div key={product.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                            <div className="flex items-center space-x-4 rtl:space-x-reverse">
                                <img src={product.images[0]} alt={product.name[lang]} className="w-16 h-16 rounded-md object-cover" />
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{product.name[lang]}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(product.price, lang)}</p>
                                    {product.stock === 0 && <p className="text-xs font-bold text-red-500 dark:text-red-400 mt-1">{t.outOfStock}</p>}
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                 <button 
                                    onClick={() => onOpenAddProductModal(product)} 
                                    className="flex items-center space-x-2 rtl:space-x-reverse bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-3 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    aria-label={`${t.edit} ${product.name[lang]}`}
                                >
                                    <PencilIcon className="w-5 h-5" />
                                    <span className="hidden sm:inline">{t.edit.replace('✏️ ', '')}</span>
                                </button>
                                <button 
                                    onClick={() => onDeleteProduct(product.id)} 
                                    className="flex items-center space-x-2 rtl:space-x-reverse bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 font-semibold px-3 py-2 rounded-lg hover:bg-red-200 dark:hover:bg-red-900 transition-colors"
                                    aria-label={`${t.delete} ${product.name[lang]}`}
                                >
                                    <TrashIcon className="w-5 h-5" />
                                     <span className="hidden sm:inline">{t.delete.replace('🗑️ ', '')}</span>
                                </button>
                            </div>
                        </div>
                    )) : (
                        <p className="text-gray-500 dark:text-gray-400">{lang === 'ar' ? 'لا توجد منتجات لإدارتها.' : 'No products to manage.'}</p>
                    )}
                </div>
            </div>

             <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl font-bold mb-4">{t.manageReviews}</h2>
                <div className="space-y-4">
                    {products.flatMap(p => p.comments.map(c => ({ product: p, comment: c }))).map(({ product, comment }) => (
                        <div key={comment.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-lg gap-4">
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Product: {product.name[lang]}</p>
                                <div className="flex items-center my-1">
                                    <RatingStars rating={comment.rating} lang={lang} />
                                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100 mx-2">{comment.author}</span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">"{comment.text}"</p>
                            </div>
                            <div className="flex items-center space-x-2 rtl:space-x-reverse flex-shrink-0">
                                <button onClick={() => onOpenEditCommentModal(product.id, comment)} className="flex items-center space-x-2 rtl:space-x-reverse bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-3 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                    <PencilIcon className="w-4 h-4" />
                                    <span>{t.edit.replace('✏️ ', '')}</span>
                                </button>
                                <button onClick={() => onDeleteComment(product.id, comment.id)} className="flex items-center space-x-2 rtl:space-x-reverse bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 font-semibold px-3 py-2 rounded-lg hover:bg-red-200 dark:hover:bg-red-900 transition-colors">
                                    <TrashIcon className="w-4 h-4" />
                                    <span>{t.delete.replace('🗑️ ', '')}</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ProfilePage: React.FC<{
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
  t: any;
  lang: 'ar' | 'en';
  showToast: (message: string) => void;
  setPage: (page: string) => void;
  onNewProfileSaved: () => void;
}> = ({ profile, setProfile, t, lang, showToast, setPage, onNewProfileSaved }) => {
  const [isEditing, setIsEditing] = useState(!profile);
  const [formData, setFormData] = useState<UserProfile>({
    fullName: profile?.fullName || '',
    phone: profile?.phone || '',
    city: profile?.city || '',
    address: profile?.address || '',
    avatarUrl: profile?.avatarUrl || AVATARS[0],
  });
  const [errors, setErrors] = useState<any>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarSelect = (url: string) => {
    setFormData(prev => ({ ...prev, avatarUrl: url }));
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        try {
            const compressedDataUrl = await compressImage(file, 200); // Smaller size for avatar
            setFormData(prev => ({ ...prev, avatarUrl: compressedDataUrl }));
        } catch (error) {
            console.error("Image compression failed:", error);
            showToast("Failed to upload image.");
        }
    }
  };

  const validate = () => {
    const newErrors: any = {};
    const phoneRegex = /^(010|011|012|015)\d{8}$/;
    if (!formData.fullName) newErrors.fullName = t.requiredField;
    if (!formData.phone) {
      newErrors.phone = t.requiredField;
    } else if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = t.phoneNumberInvalid;
    }
    if (!formData.city) newErrors.city = t.requiredField;
    if (!formData.address) newErrors.address = t.requiredField;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const wasProfileNull = !profile;
    if (validate()) {
      setProfile(formData);
      if (wasProfileNull) {
        onNewProfileSaved();
      }
      showToast(t.profileSavedSuccess);
      setIsEditing(false);
    }
  };
  
  const handleLogout = () => {
    setProfile(null);
    setPage('home');
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">{t.yourProfile}</h1>
        {!isEditing && profile && (
          <div className="flex items-center gap-2">
             <button onClick={handleLogout} className="flex items-center space-x-2 rtl:space-x-reverse bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 font-semibold px-4 py-2 rounded-lg hover:bg-red-200 dark:hover:bg-red-900 transition-colors">
                <LogoutIcon className="w-5 h-5"/>
                <span>{t.logout}</span>
            </button>
            <button onClick={() => setIsEditing(true)} className="flex items-center space-x-2 rtl:space-x-reverse bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                <PencilIcon className="w-5 h-5"/>
                <span>{t.editProfile.replace('✏️ ', '')}</span>
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.profilePicture}</label>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <img src={formData.avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover bg-gray-200 dark:bg-gray-700" />
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="sr-only" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <CameraIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <span className="sr-only">{t.uploadAPhoto}</span>
                  </button>
                </div>
                <div>
                  <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">{t.chooseAnAvatar}</h3>
                  <div className="flex flex-wrap gap-2">
                    {AVATARS.map(url => (
                      <button type="button" key={url} onClick={() => handleAvatarSelect(url)} className={`w-12 h-12 rounded-full p-1 transition-all duration-200 ${formData.avatarUrl === url ? 'bg-indigo-500' : 'bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                        <img src={url} alt="avatar option" className="w-full h-full rounded-full object-cover bg-gray-100 dark:bg-gray-600" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.fullName}</label>
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 border-transparent rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                    {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.phoneNumber}</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 border-transparent rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.city}</label>
                <input type="text" name="city" value={formData.city} onChange={handleChange} className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 border-transparent rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.addressDetails}</label>
                <textarea name="address" value={formData.address} onChange={handleChange} rows={3} className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 border-transparent rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
            </div>

            <div className="pt-4">
                <button type="submit" className="w-full gradient-btn text-white font-bold py-3 px-6 rounded-lg text-lg flex items-center justify-center gap-2">
                    {t.saveProfile}
                </button>
            </div>
        </form>
      ) : profile ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-6">
            <img src={profile.avatarUrl} alt="Avatar" className="w-32 h-32 rounded-full object-cover bg-gray-200 dark:bg-gray-700 ring-4 ring-indigo-300 dark:ring-indigo-800 ring-offset-4 ring-offset-white dark:ring-offset-gray-900" />
            <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.fullName}</h2>
                <p className="text-gray-600 dark:text-gray-300 mt-1">{profile.phone}</p>
                <p className="text-gray-500 dark:text-gray-400 mt-2">{profile.address}, {profile.city}</p>
            </div>
        </div>
      ) : null}
    </div>
  );
};

const AddProductModal: React.FC<{ isOpen: boolean; onClose: () => void; onSaveProduct: (productData: any) => void; t: any; lang: 'ar' | 'en'; productToEdit: Product | null; }> = ({ isOpen, onClose, onSaveProduct, t, lang, productToEdit }) => {
    const [image, setImage] = useState<string | null>(null);
    const [nameAr, setNameAr] = useState('');
    const [nameEn, setNameEn] = useState('');
    const [descriptionAr, setDescriptionAr] = useState('');
    const [descriptionEn, setDescriptionEn] = useState('');
    const [price, setPrice] = useState('');
    const [originalPrice, setOriginalPrice] = useState('');
    const [stock, setStock] = useState('');
    const [category, setCategory] = useState('mens');
    const [errors, setErrors] = useState<any>({});
    
    const resetForm = useCallback(() => {
        setImage(null);
        setNameAr('');
        setNameEn('');
        setDescriptionAr('');
        setDescriptionEn('');
        setPrice('');
        setOriginalPrice('');
        setStock('');
        setCategory('mens');
        setErrors({});
    }, []);

    useEffect(() => {
        if (isOpen) {
            if (productToEdit) {
                setImage(productToEdit.images[0]);
                setNameAr(productToEdit.name.ar);
                setNameEn(productToEdit.name.en);
                setDescriptionAr(productToEdit.description.ar);
                setDescriptionEn(productToEdit.description.en);
                setPrice(String(productToEdit.price));
                setOriginalPrice(productToEdit.originalPrice ? String(productToEdit.originalPrice) : '');
                setStock(String(productToEdit.stock));
                const categoryKey = Object.keys(translations.ar).find(key => translations.ar[key as keyof typeof translations.ar] === productToEdit.category.ar);
                setCategory(categoryKey || 'mens');
            } else {
                resetForm();
            }
        }
    }, [isOpen, productToEdit, resetForm]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressedDataUrl = await compressImage(file);
                setImage(compressedDataUrl);
                setErrors((prev: any) => ({ ...prev, image: null }));
            } catch (error) {
                console.error("Image compression failed:", error);
                setErrors((prev: any) => ({ ...prev, image: 'Image compression failed.' }));
            }
        }
    };

    const validate = () => {
        const newErrors: any = {};
        if (!image) newErrors.image = t.pleaseSelectImage;
        if (!nameAr) newErrors.nameAr = t.requiredField;
        if (!nameEn) newErrors.nameEn = t.requiredField;
        if (!descriptionAr) newErrors.descriptionAr = t.requiredField;
        if (!descriptionEn) newErrors.descriptionEn = t.requiredField;
        if (!price || isNaN(Number(price)) || Number(price) <= 0) newErrors.price = 'السعر يجب أن يكون رقمًا موجبًا';
        if (originalPrice && (isNaN(Number(originalPrice)) || Number(originalPrice) <= 0)) newErrors.originalPrice = 'السعر الأصلي يجب أن يكون رقمًا موجبًا';
        if (!stock) {
            newErrors.stock = t.requiredField;
        } else if (isNaN(Number(stock)) || !Number.isInteger(Number(stock)) || Number(stock) < 0) {
            newErrors.stock = t.quantityMustBeInteger;
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        
        const categoryMap = {
            mens: { ar: 'رجالي', en: "Men's" },
            womens: { ar: 'بناتي', en: "Women's" },
            youth: { ar: 'شبابي', en: "Youth" },
        };

        const productData = {
            name: { ar: nameAr, en: nameEn },
            description: { ar: descriptionAr, en: descriptionEn },
            price: Number(price),
            originalPrice: originalPrice ? Number(originalPrice) : undefined,
            category: categoryMap[category as keyof typeof categoryMap],
            images: [image],
            stock: Number(stock),
        };
        
        if (productToEdit) {
            onSaveProduct({ ...productToEdit, ...productData });
        } else {
            onSaveProduct(productData);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{productToEdit ? t.editProduct : t.addProduct}</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.uploadImage}</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    {image ? <img src={image} alt="Preview" className="mx-auto h-24 w-auto rounded-md" /> : <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 4v.01M28 8l-6-6-6 6M28 8v10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"><p className="px-1">{lang === 'ar' ? 'اختر ملف' : 'Select file'}</p><input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} /></label>
                                    </div>
                                </div>
                            </div>
                            {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.nameInArabic}</label><input type="text" value={nameAr} onChange={e => setNameAr(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 border-transparent rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />{errors.nameAr && <p className="text-red-500 text-xs mt-1">{errors.nameAr}</p>}</div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.nameInEnglish}</label><input type="text" value={nameEn} onChange={e => setNameEn(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 border-transparent rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />{errors.nameEn && <p className="text-red-500 text-xs mt-1">{errors.nameEn}</p>}</div>
                        </div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.descriptionInArabic}</label><textarea value={descriptionAr} onChange={e => setDescriptionAr(e.target.value)} rows={3} className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 border-transparent rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"></textarea>{errors.descriptionAr && <p className="text-red-500 text-xs mt-1">{errors.descriptionAr}</p>}</div>
                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.descriptionInEnglish}</label><textarea value={descriptionEn} onChange={e => setDescriptionEn(e.target.value)} rows={3} className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 border-transparent rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"></textarea>{errors.descriptionEn && <p className="text-red-500 text-xs mt-1">{errors.descriptionEn}</p>}</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.price}</label><input type="number" value={price} onChange={e => setPrice(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 border-transparent rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />{errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}</div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.originalPrice}</label><input type="number" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 border-transparent rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />{errors.originalPrice && <p className="text-red-500 text-xs mt-1">{errors.originalPrice}</p>}</div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.availableQuantity}</label><input type="number" value={stock} onChange={e => setStock(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 border-transparent rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" min="0" step="1" />{errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}</div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.category}</label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 border-transparent rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3">
                                <option value="mens">{t.mens}</option>
                                <option value="womens">{t.womens}</option>
                                <option value="youth">{t.youth}</option>
                            </select>
                        </div>
                        <div className="pt-4 flex justify-end">
                            <button type="submit" className="w-full gradient-btn text-white font-bold py-3 px-6 rounded-lg text-lg flex items-center justify-center gap-2">
                                {productToEdit ? t.saveChanges : t.saveProduct}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const EditCommentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (productId: number, updatedComment: Comment) => void;
  commentInfo: CommentWithProductInfo | null;
  t: any;
}> = ({ isOpen, onClose, onSave, commentInfo, t }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState('');

  useEffect(() => {
    if (commentInfo) {
      setRating(commentInfo.comment.rating);
      setText(commentInfo.comment.text);
    }
  }, [commentInfo]);

  if (!isOpen || !commentInfo) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedComment = { ...commentInfo.comment, rating, text };
    onSave(commentInfo.productId, updatedComment);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t.editComment}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.yourRating}</label>
              <div className="flex items-center" onMouseLeave={() => setHoverRating(0)}>
                {[...Array(5)].map((_, i) => (
                  <button type="button" key={i} onClick={() => setRating(i + 1)} onMouseEnter={() => setHoverRating(i + 1)}>
                    <StarIcon className={`h-8 w-8 transition-colors ${(hoverRating || rating) > i ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder={t.yourComment} rows={4} className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 border-transparent rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"></textarea>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-4 rtl:space-x-reverse">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
              {t.cancel}
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg font-semibold gradient-btn text-white flex items-center justify-center gap-2">
              {t.saveChanges}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  t: any;
}> = ({ isOpen, onClose, onConfirm, title, message, t }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
          <div className="flex justify-end space-x-4 rtl:space-x-reverse">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              {t.delete}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PasswordModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  t: any;
}> = ({ isOpen, onClose, onSuccess, t }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setTimeout(() => passwordInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'متجر برو') {
      onSuccess();
    } else {
      setError(t.incorrectPassword);
      setPassword('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t.enterPassword}</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{t.settingsProtected}</p>
          <div>
            <input
              ref={passwordInputRef}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 block w-full bg-gray-100 dark:bg-gray-800 border-transparent rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={t.passwordPlaceholder}
            />
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </div>
          <div className="mt-6 flex justify-end space-x-4 rtl:space-x-reverse">
             <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg font-semibold gradient-btn text-white"
            >
              {t.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BackgroundEffects: React.FC = () => {
    const [isAnimating, setIsAnimating] = useState(false);
    const animationTimeoutRef = useRef<number | null>(null);
    const intervalTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const triggerAnimation = () => {
            setIsAnimating(true);
            
            if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
            animationTimeoutRef.current = window.setTimeout(() => {
                setIsAnimating(false);
            }, 1000); // Animation duration from CSS

            if (intervalTimeoutRef.current) clearTimeout(intervalTimeoutRef.current);
            const nextDelay = Math.random() * 8000 + 4000; // Randomly between 4-12 seconds
            intervalTimeoutRef.current = window.setTimeout(triggerAnimation, nextDelay);
        };

        const firstDelay = Math.random() * 3000 + 1000; // First one between 1-4 seconds
        intervalTimeoutRef.current = window.setTimeout(triggerAnimation, firstDelay);

        return () => {
            if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
            if (intervalTimeoutRef.current) clearTimeout(intervalTimeoutRef.current);
        };
    }, []);

    return (
        <div className="background-effects" aria-hidden="true">
            <div className={`lightning-bolt ${isAnimating ? 'animate' : ''}`} />
        </div>
    );
};


// MAIN APP COMPONENT

function App() {
  type Theme = 'light' | 'dark';
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }
    return 'dark'; // Default to dark if stored value is invalid (e.g., 'animated')
  });
  const [language, setLanguage] = useState<'ar' | 'en'>(() => (localStorage.getItem('language') as 'ar' | 'en') || 'ar');
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [cart, setCart] = useLocalStorage<CartItem[]>('cartItems', []);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [toast, setToast] = useState({ visible: false, message: '' });
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const JSON_BLOB_URL = 'https://jsonblob.com/api/jsonBlob/1266023250811068416';

  const [isAddProductModalOpen, setAddProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productIdToDelete, setProductIdToDelete] = useState<number | null>(null);
  const [telegramToken, setTelegramToken] = useLocalStorage<string>('telegramToken', '7880467843:AAEZjI1UCsk_ObLhTgQIHbg1SgZ_l_k3fCg');
  const [telegramChatId, setTelegramChatId] = useLocalStorage<string>('telegramChatId', '7731994514');
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
  const [isSettingsAuthenticated, setSettingsAuthenticated] = useState(false);
  const [profile, setProfile] = useLocalStorage<UserProfile | null>('userProfile', null);
  const [motivationalToast, setMotivationalToast] = useState({ visible: false, message: '' });

  const [commentToDelete, setCommentToDelete] = useState<{ productId: number; commentId: number } | null>(null);
  const [commentToEdit, setCommentToEdit] = useState<CommentWithProductInfo | null>(null);
  const [isProfileGlowing, setIsProfileGlowing] = useState(false);
  
  const t = useMemo(() => translations[language], [language]);

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => {
      setToast({ visible: false, message: '' });
    }, 3000);
  }, []);

  useEffect(() => {
    const showMotivationalToast = () => {
        const messages = MOTIVATIONAL_MESSAGES[language];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        setMotivationalToast({ visible: true, message: randomMessage });
        setTimeout(() => {
            setMotivationalToast({ visible: false, message: '' });
        }, 8000);
    };

    const intervalId = setInterval(showMotivationalToast, 60000); // Every 60 seconds

    return () => clearInterval(intervalId);
  }, [language]);

  useEffect(() => {
    const fetchProducts = async (isInitialLoad = false) => {
      if (isInitialLoad) setIsLoadingProducts(true);
      try {
        const response = await fetch(JSON_BLOB_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            const sanitizedData = data.map((p: any) => ({
              ...p,
              comments: Array.isArray(p.comments) ? p.comments : [],
              images: Array.isArray(p.images) ? p.images : [],
            }));
            setProducts(sanitizedData);
        } else {
            console.error("Fetched data is not an array or is empty, using fallback.", data);
            setProducts(PRODUCTS); 
        }
      } catch (error) {
        console.error("Could not fetch products:", error);
        setProducts(PRODUCTS);
      } finally {
        if (isInitialLoad) setIsLoadingProducts(false);
      }
    };

    fetchProducts(true);

    const intervalId = setInterval(() => fetchProducts(false), 30000); // Sync every 30s

    return () => clearInterval(intervalId);
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
        const matchesCategory = activeCategory === 'All' || product.category.en === activeCategory;
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery || 
                              product.name.en.toLowerCase().includes(searchLower) ||
                              product.name.ar.toLowerCase().includes(searchLower) ||
                              product.description.en.toLowerCase().includes(searchLower) ||
                              product.description.ar.toLowerCase().includes(searchLower);
        return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory, products]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    if (theme === 'dark') {
      root.classList.add('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = language === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('language', language);
  }, [language]);
  
  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
  }, []);
  
  const setPage = useCallback((page: string) => {
      if (page === 'settings' && !isSettingsAuthenticated) {
        setPasswordModalOpen(true);
        return;
      }
      setCurrentPage(page);
      window.scrollTo(0, 0);
  }, [isSettingsAuthenticated]);

  const handleViewProduct = (productId: number) => {
    setSelectedProductId(productId);
    setPage('product');
  };

  const handleAddToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
    showToast(t.addedToCart);
  };

  const handleUpdateCartQuantity = (productId: number, quantity: number) => {
    setCart(prevCart => {
      if (quantity <= 0) {
        return prevCart.filter(item => item.id !== productId);
      }
      return prevCart.map(item =>
        item.id === productId ? { ...item, quantity: quantity } : item
      );
    });
  };

  const handleCategorySelect = (category: string) => {
    setActiveCategory(category);
    setPage('home');
  };
  
  const updateRemoteProducts = async (updatedProducts: Product[]) => {
    try {
      const response = await fetch(JSON_BLOB_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(updatedProducts),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to update remote products:", error);
      throw error;
    }
  };
  
  const handleSaveProduct = async (productData: Product | Omit<Product, 'id' | 'rating' | 'reviewCount' | 'soldCount' | 'comments'>) => {
      const isEditing = 'id' in productData;
      const originalProducts = products;
      let updatedProducts: Product[];

      if (isEditing) {
          updatedProducts = originalProducts.map(p => p.id === productData.id ? { ...p, ...productData } : p);
          showToast(t.productSavedSuccess);
      } else {
          const newProduct: Product = {
              id: Date.now(),
              rating: 0,
              reviewCount: 0,
              soldCount: 0,
              comments: [],
              ...productData,
          };
          updatedProducts = [newProduct, ...originalProducts];
          showToast(t.productAddedSuccess);
      }

      setProducts(updatedProducts);
      setAddProductModalOpen(false);
      setProductToEdit(null);
      
      try {
          await updateRemoteProducts(updatedProducts);
      } catch (error) {
          setProducts(originalProducts);
          showToast(t.productSaveError);
      }
  };

  const requestDeleteProduct = (productId: number) => {
    setProductIdToDelete(productId);
  };

  const executeDeleteProduct = async () => {
    if (productIdToDelete === null) return;

    const originalProducts = products;
    const updatedProducts = originalProducts.filter(p => p.id !== productIdToDelete);

    setProducts(updatedProducts);
    showToast(t.productDeletedSuccess);
    setProductIdToDelete(null);

    try {
        await updateRemoteProducts(updatedProducts);
    } catch (error) {
        setProducts(originalProducts);
        showToast(t.productDeleteError);
    }
  };

  const handleSaveTelegramSettings = (token: string, chatId: string) => {
      setTelegramToken(token);
      setTelegramChatId(chatId);
      showToast(t.settingsSavedSuccess);
  };
  
  const handleOpenAddProductModal = (product?: Product) => {
      if (product) {
          setProductToEdit(product);
      } else {
          setProductToEdit(null);
      }
      setAddProductModalOpen(true);
  };

  const sendOrderToTelegram = async (shippingDetails: ShippingDetails, cartItems: CartItem[]) => {
      if (!telegramToken || !telegramChatId) {
          console.log("Telegram credentials not set. Skipping notification.");
          return;
      }

      const escapeMarkdown = (text: string | number) => String(text).replace(/([_*\[\]()~`>#\+\-=|{}.!])/g, '\\$1');

      const total = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2);
      
      let message = `*طلب جديد\\!* 🛍️\n\n`;
      message += `*بيانات العميل:*\n`;
      message += `*الاسم:* ${escapeMarkdown(shippingDetails.fullName)}\n`;
      message += `*الهاتف:* ${escapeMarkdown(shippingDetails.phone)}\n`;
      message += `*العنوان:* ${escapeMarkdown(shippingDetails.address)}, ${escapeMarkdown(shippingDetails.city)}\n\n`;
      message += `*المنتجات المطلوبة:*\n`;

      cartItems.forEach((item, index) => {
          const itemTotal = (item.price * item.quantity).toFixed(2);
          message += `${index + 1}\\. ${escapeMarkdown(item.name[language])} \\(x${item.quantity}\\) \\- ${escapeMarkdown(formatCurrency(parseFloat(itemTotal), language))}\n`;
      });

      message += `\n*الإجمالي: ${escapeMarkdown(formatCurrency(parseFloat(total), language))}*`;

      const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;

      try {
          const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  chat_id: telegramChatId,
                  text: message,
                  parse_mode: 'MarkdownV2'
              })
          });
          const data = await response.json();
          if (!data.ok) {
              console.error("Telegram API Error:", data.description);
          }
      } catch (error) {
          console.error("Failed to send order to Telegram:", error);
      }
  };
  
  const sendStockAlertToTelegram = async (product: Product) => {
      if (!telegramToken || !telegramChatId) {
          console.log("Telegram credentials not set. Skipping stock alert.");
          return;
      }

      const escapeMarkdown = (text: string | number) => String(text).replace(/([_*\[\]()~`>#\+\-=|{}.!])/g, '\\$1');
      
      const alertTranslations = translations['ar']; // Admin notifications in Arabic
      const title = alertTranslations.stockAlertTitle;
      const body = alertTranslations.stockAlertBody.replace('{productName}', escapeMarkdown(product.name['ar']));

      const message = `*${title}*\n\n${body}`;

      const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;

      try {
          const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  chat_id: telegramChatId,
                  text: message,
                  parse_mode: 'MarkdownV2'
              })
          });
          const data = await response.json();
          if (!data.ok) {
              console.error("Telegram Stock Alert API Error:", data.description);
          }
      } catch (error) {
          console.error("Failed to send stock alert to Telegram:", error);
      }
  };

  const handlePlaceOrder = async (shippingDetails: ShippingDetails) => {
      // Identify products that will run out of stock after this order
      const productsRunningOut = cart
          .map(cartItem => {
              const productInStore = products.find(p => p.id === cartItem.id);
              // Check if stock will be zero or less after purchase
              if (productInStore && (productInStore.stock - cartItem.quantity) <= 0) {
                  return productInStore;
              }
              return null;
          })
          .filter((p): p is Product => p !== null);

      // Deduct stock and increment soldCount from products
      const updatedProducts = products.map(product => {
          const itemInCart = cart.find(item => item.id === product.id);
          if (itemInCart) {
              return { 
                  ...product, 
                  stock: Math.max(0, product.stock - itemInCart.quantity),
                  soldCount: product.soldCount + itemInCart.quantity
              };
          }
          return product;
      });
      setProducts(updatedProducts);
      await updateRemoteProducts(updatedProducts);
      
      // Send notifications for each product that just ran out
      for (const product of productsRunningOut) {
          await sendStockAlertToTelegram(product);
      }
      
      await sendOrderToTelegram(shippingDetails, cart);
      showToast(t.confirmOrderMsg);
      setCart([]);
      setPage('home');
  };

  const requestDeleteComment = (productId: number, commentId: number) => {
    setCommentToDelete({ productId, commentId });
  };
  
  const executeDeleteComment = async () => {
    if (!commentToDelete) return;
    const { productId, commentId } = commentToDelete;
    const originalProducts = [...products];
    let updatedProducts = [...products];
    const productIndex = updatedProducts.findIndex(p => p.id === productId);

    if (productIndex > -1) {
      const product = { ...updatedProducts[productIndex] };
      const originalComments = [...product.comments];
      product.comments = product.comments.filter(c => c.id !== commentId);
      
      if (product.comments.length < originalComments.length) {
        product.reviewCount = product.comments.length;
        product.rating = product.reviewCount > 0 ? product.comments.reduce((sum, c) => sum + c.rating, 0) / product.reviewCount : 0;
        updatedProducts[productIndex] = product;

        setProducts(updatedProducts);
        showToast(t.commentDeletedSuccess);
        setCommentToDelete(null);

        try {
          await updateRemoteProducts(updatedProducts);
        } catch (error) {
          setProducts(originalProducts);
          showToast(t.commentDeleteError);
        }
      }
    } else {
        setCommentToDelete(null);
    }
  };
  
  const handleOpenEditCommentModal = (productId: number, comment: Comment) => {
    setCommentToEdit({ productId, comment });
  };
  
  const handleUpdateComment = async (productId: number, updatedComment: Comment) => {
    const originalProducts = [...products];
    let updatedProducts = [...products];
    const productIndex = updatedProducts.findIndex(p => p.id === productId);

    if (productIndex > -1) {
        const product = { ...updatedProducts[productIndex] };
        product.comments = product.comments.map(c => c.id === updatedComment.id ? updatedComment : c);
        product.rating = product.comments.reduce((sum, c) => sum + c.rating, 0) / product.reviewCount;
        updatedProducts[productIndex] = product;

        setProducts(updatedProducts);
        showToast(t.commentSavedSuccess);
        setCommentToEdit(null);

        try {
            await updateRemoteProducts(updatedProducts);
        } catch (error) {
            setProducts(originalProducts);
            showToast(t.commentSaveError);
        }
    } else {
        setCommentToEdit(null);
    }
  };
  
  const handleNewProfileSaved = () => {
      setIsProfileGlowing(true);
      setTimeout(() => {
          setIsProfileGlowing(false);
      }, 7500); // Animation duration (2.5s * 3 iterations)
  };

  const cartCount = useMemo(() => cart.reduce((count, item) => count + item.quantity, 0), [cart]);
  
  const renderPage = () => {
    switch(currentPage) {
        case 'product':
            if (selectedProductId) {
                return <ProductPage productId={selectedProductId} products={products} t={t} lang={language} onAddToCart={handleAddToCart} onSaveProduct={handleSaveProduct} profile={profile} cartItems={cart} />;
            }
            return <HomePage products={filteredProducts} allProducts={products} t={t} lang={language} onAddToCart={handleAddToCart} onViewProduct={handleViewProduct} activeCategory={activeCategory} setActiveCategory={handleCategorySelect} />;
        case 'cart':
            return <CartPage cartItems={cart} t={t} lang={language} updateCartQuantity={handleUpdateCartQuantity} setPage={setPage} />;
        case 'settings':
            if (!isSettingsAuthenticated) {
                useEffect(() => {
                    setCurrentPage('home');
                }, []);
                return null;
            }
            return <SettingsPage t={t} lang={language} onOpenAddProductModal={handleOpenAddProductModal} products={products} onDeleteProduct={requestDeleteProduct} telegramToken={telegramToken} telegramChatId={telegramChatId} onSaveTelegramSettings={handleSaveTelegramSettings} onOpenEditCommentModal={handleOpenEditCommentModal} onDeleteComment={requestDeleteComment} />;
        case 'profile':
            return <ProfilePage profile={profile} setProfile={setProfile} t={t} lang={language} showToast={showToast} setPage={setPage} onNewProfileSaved={handleNewProfileSaved} />;
        case 'checkout':
             return <CheckoutPage cartItems={cart} t={t} lang={language} onPlaceOrder={handlePlaceOrder} setPage={setPage} profile={profile} />;
        case 'home':
        default:
            return <HomePage products={filteredProducts} allProducts={products} t={t} lang={language} onAddToCart={handleAddToCart} onViewProduct={handleViewProduct} activeCategory={activeCategory} setActiveCategory={handleCategorySelect} />;
    }
  };
  
  if (isLoadingProducts) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="text-center">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-200">{t.loadingProducts}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${language === 'ar' ? 'font-ar' : 'font-en'} bg-white dark:bg-black`}>
      {currentPage === 'home' && theme === 'dark' && <BackgroundEffects />}
      <Toast message={toast.message} visible={toast.visible} lang={language} />
      <MotivationalToast message={motivationalToast.message} visible={motivationalToast.visible} title={t.motivationalMessage} />
      <AddProductModal isOpen={isAddProductModalOpen} onClose={() => setAddProductModalOpen(false)} onSaveProduct={handleSaveProduct} t={t} lang={language} productToEdit={productToEdit} />
      <EditCommentModal 
        isOpen={commentToEdit !== null}
        onClose={() => setCommentToEdit(null)}
        onSave={handleUpdateComment}
        commentInfo={commentToEdit}
        t={t}
      />
      <ConfirmationModal
        isOpen={productIdToDelete !== null}
        onClose={() => setProductIdToDelete(null)}
        onConfirm={executeDeleteProduct}
        title={t.confirmDeletionTitle}
        message={t.confirmDeleteProduct}
        t={t}
      />
      <ConfirmationModal
        isOpen={commentToDelete !== null}
        onClose={() => setCommentToDelete(null)}
        onConfirm={executeDeleteComment}
        title={t.confirmDeletionTitle}
        message={t.confirmDeleteComment}
        t={t}
      />
      <PasswordModal 
          isOpen={isPasswordModalOpen}
          onClose={() => setPasswordModalOpen(false)}
          onSuccess={() => {
              setSettingsAuthenticated(true);
              setPasswordModalOpen(false);
              setCurrentPage('settings'); // Use setCurrentPage directly here
          }}
          t={t}
      />
      <MobileHeader 
        t={t}
        lang={language}
        theme={theme}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        toggleLanguage={toggleLanguage}
        toggleTheme={toggleTheme}
        setPage={setPage}
      />
      <Header
        t={t}
        lang={language}
        theme={theme}
        cartCount={cartCount}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setActiveCategory={handleCategorySelect}
        toggleLanguage={toggleLanguage}
        toggleTheme={toggleTheme}
        setPage={setPage}
        products={products}
        profile={profile}
        isProfileGlowing={isProfileGlowing}
      />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        <div key={currentPage} className="page-container">
            {renderPage()}
        </div>
      </main>
      <BottomNav t={t} cartCount={cartCount} setPage={setPage} currentPage={currentPage} profile={profile} isProfileGlowing={isProfileGlowing} />
    </div>
  );
}

export default App;