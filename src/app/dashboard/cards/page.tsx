'use client';

import { useState, useEffect } from 'react';
import { Card, CardPackage, AppSettings } from '@/lib/types';
import { getCardPackages, getAppSettings } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingBag, Search as SearchIcon, MessageCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const categoryIcons = {
    'Games': '🎮',
    'Apps': '📱',
    'GiftCards': '🎁',
    'Subscriptions': '⭐'
};

export default function UserCardsPage() {
    const [packages, setPackages] = useState<CardPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [settings, setSettings] = useState<AppSettings | null>(null);

    // Purchase
    const [productDialogOpen, setProductDialogOpen] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<CardPackage | null>(null);
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');

    // User Context
    const [user, setUser] = useState<any>(null);

    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const userStr = localStorage.getItem('loggedInUser');
            if (userStr) {
                setUser(JSON.parse(userStr));

                const [packagesData, settingsData] = await Promise.all([
                    getCardPackages(),
                    getAppSettings()
                ]);

                setPackages(packagesData);
                setSettings(settingsData);
            } else {
                router.push('/login');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getPrice = (costUSD: number, margin: number) => {
        if (!settings?.exchangeRate) return 0;
        return (costUSD * (1 + margin / 100) * settings.exchangeRate).toFixed(2);
    };

    const getLowestPriceForPackage = (pkg: CardPackage) => {
        if (!pkg.variants || pkg.variants.length === 0) return 0;
        const prices = pkg.variants.map(v => Number(getPrice(v.costUSD, pkg.profitMarginCash)));
        return Math.min(...prices).toFixed(2);
    };

    const handlePackageClick = (pkg: CardPackage) => {
        setSelectedPackage(pkg);
        setSelectedVariantId(null);
        setPaymentMethod('cash'); // Default
        setProductDialogOpen(true);
    };

    const handleWhatsAppPurchase = () => {
        if (!selectedPackage || !selectedVariantId || !user) return;

        const variant = selectedPackage.variants.find(v => v.id === selectedVariantId);
        if (!variant) return;

        const margin = paymentMethod === 'cash' ? selectedPackage.profitMarginCash : selectedPackage.profitMarginBank;
        const finalPrice = getPrice(variant.costUSD, margin);
        const methodText = paymentMethod === 'cash' ? 'كاش' : 'مصرفي';

        const message = `مرحبا ترند بلاس، أود شراء بطاقة:
- الخدمة: ${selectedPackage.service}
- الفئة: ${variant.name}
- طريقة الدفع: ${methodText}
- السعر: ${finalPrice} د.ل
- اسم المستخدم: ${user.name}
- رقم الهاتف: ${user.phone || 'غير مسجل'}`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/218923136528?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');
        setProductDialogOpen(false);
    };

    const filteredPackages = packages.filter(pkg => {
        const matchesCategory = !selectedCategory || pkg.category === selectedCategory;
        const matchesSearch = !searchQuery || pkg.service.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-pink-500" /></div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-20" dir="rtl">
            <div className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-20 px-4 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <h1 className="text-2xl font-black flex items-center gap-2">
                        <ShoppingBag className="text-pink-500 w-7 h-7" />
                        <span className="bg-gradient-to-l from-pink-400 to-rose-500 bg-clip-text text-transparent">المتجر</span>
                    </h1>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4 space-y-6">

                {/* Search */}
                <div className="relative">
                    <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <Input
                        placeholder="ابحث عن بطاقة..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pr-12 h-14 bg-slate-900 border-slate-800 rounded-2xl"
                    />
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button onClick={() => setSelectedCategory(null)} className={`px-6 py-3 rounded-full font-bold whitespace-nowrap transition-all ${!selectedCategory ? 'bg-pink-600 shadow-lg shadow-pink-500/20' : 'bg-slate-900 border border-slate-800'}`}>الكل</button>
                    {['Games', 'Apps', 'GiftCards', 'Subscriptions'].map(cat => (
                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-3 rounded-full font-bold whitespace-nowrap flex items-center gap-2 transition-all ${selectedCategory === cat ? 'bg-pink-600 shadow-lg shadow-pink-500/20' : 'bg-slate-900 border border-slate-800'}`}>
                            <span>{categoryIcons[cat as keyof typeof categoryIcons]}</span>
                            {cat === 'Games' && 'ألعاب'}
                            {cat === 'Apps' && 'تطبيقات'}
                            {cat === 'GiftCards' && 'بطاقات هدايا'}
                            {cat === 'Subscriptions' && 'اشتراكات'}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredPackages.map((pkg) => (
                        <motion.div
                            key={pkg.id}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => handlePackageClick(pkg)}
                            className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 cursor-pointer group hover:border-pink-500/50 transition-colors"
                        >
                            <div className="aspect-[3/4] bg-slate-800 relative flex items-center justify-center">
                                {pkg.image ? (
                                    <img src={pkg.image} alt={pkg.service} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-6xl">{categoryIcons[pkg.category as keyof typeof categoryIcons]}</div>
                                )}
                            </div>
                            <div className="p-3">
                                <h3 className="font-bold text-sm truncate group-hover:text-pink-400 transition-colors">{pkg.service}</h3>
                                <div className="text-xs text-slate-400 mt-1 flex justify-between items-center">
                                    <span>يبدأ من</span>
                                    <span className="text-pink-400 font-bold">{getLowestPriceForPackage(pkg)} د.ل</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

            </div>

            {/* Purchase Dialog */}
            <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-center text-xl">{selectedPackage?.service}</DialogTitle>
                    </DialogHeader>
                    {selectedPackage && (
                        <div className="space-y-6">

                            {/* Variants List */}
                            <div className="space-y-3">
                                <Label className="text-slate-400">اختر الفئة</Label>
                                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                                    {selectedPackage.variants?.map(variant => {
                                        const margin = paymentMethod === 'cash' ? selectedPackage.profitMarginCash : selectedPackage.profitMarginBank;
                                        const price = getPrice(variant.costUSD, margin);

                                        return (
                                            <button
                                                key={variant.id}
                                                onClick={() => setSelectedVariantId(variant.id)}
                                                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${selectedVariantId === variant.id
                                                    ? 'border-pink-500 bg-pink-500/10'
                                                    : 'border-slate-800 bg-slate-800/50 hover:border-slate-700'
                                                    }`}
                                            >
                                                <span className="font-bold text-sm">{variant.name}</span>
                                                <span className="text-pink-400 font-bold text-xs mt-1">{price} د.ل</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="space-y-3">
                                <Label className="text-slate-400">طريقة الدفع</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setPaymentMethod('cash')}
                                        className={`p-3 rounded-xl border text-center font-bold transition-all ${paymentMethod === 'cash'
                                            ? 'border-green-500 bg-green-500/10 text-green-400'
                                            : 'border-slate-800 bg-slate-800/50 text-slate-400'
                                            }`}
                                    >
                                        كاش (Cash)
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('bank')}
                                        className={`p-3 rounded-xl border text-center font-bold transition-all ${paymentMethod === 'bank'
                                            ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                                            : 'border-slate-800 bg-slate-800/50 text-slate-400'
                                            }`}
                                    >
                                        مصرفي (Bank)
                                    </button>
                                </div>
                            </div>

                            {/* Summary */}
                            {selectedVariantId && (
                                <div className="bg-slate-800/50 p-4 rounded-xl space-y-2 border border-slate-800">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">الفئة المختارة:</span>
                                        <span className="font-bold">{selectedPackage.variants.find(v => v.id === selectedVariantId)?.name}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold border-t border-slate-700 pt-2 mt-2">
                                        <span>السعر النهائي:</span>
                                        <span className="text-pink-400">
                                            {getPrice(
                                                selectedPackage.variants.find(v => v.id === selectedVariantId)!.costUSD,
                                                paymentMethod === 'cash'
                                                    ? selectedPackage.profitMarginCash
                                                    : selectedPackage.profitMarginBank
                                            )} د.ل
                                        </span>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                    <DialogFooter className="mt-4">
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg font-bold gap-2 shadow-lg shadow-green-900/20"
                            onClick={handleWhatsAppPurchase}
                            disabled={!selectedVariantId}
                        >
                            <MessageCircle className="w-5 h-5" />
                            طلب عبر واتساب
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
