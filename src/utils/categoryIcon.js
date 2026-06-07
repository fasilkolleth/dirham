import {
  CreditCard, Home, Car, Landmark, Building2, Utensils, Wifi, Smartphone,
  Briefcase, ArrowLeftRight, Zap, Fuel, ShieldCheck, GraduationCap,
  ShoppingBag, HeartPulse, Dumbbell, Plane, PiggyBank, Repeat, Receipt, Banknote,
} from 'lucide-react'

// Maps a free-text category name to a lucide icon by keyword. First match wins,
// so rules are ordered specific → generic. Tune freely as new categories appear.
const ICON_RULES = [
  [['credit card', 'creditcard', 'visa', 'mastercard'], CreditCard],
  [['mortgage', 'home loan', 'house'],                  Home],
  [['car loan', 'car ', 'vehicle', 'auto loan'],        Car],
  [['rent'],                                            Building2],
  [['loan', 'settlement', 'emi', 'finance'],            Landmark],
  [['meal', 'food', 'grocer', 'dining', 'restaurant'],  Utensils],
  [['wifi', 'internet', 'broadband'],                   Wifi],
  [['phone', 'mobile', 'etisalat'],                     Smartphone],
  [['salary', 'payroll', 'wage', 'bonus'],              Briefcase],
  [['transfer', 'remit'],                               ArrowLeftRight],
  [['electric', 'water', 'utility', 'dewa', 'sewa'],    Zap],
  [['fuel', 'petrol'],                                  Fuel],
  [['insurance'],                                       ShieldCheck],
  [['school', 'tuition', 'education', 'college'],       GraduationCap],
  [['shopping', 'clothes', 'amazon', 'noon'],           ShoppingBag],
  [['health', 'medical', 'clinic', 'pharmacy', 'doctor', 'hospital'], HeartPulse],
  [['gym', 'fitness'],                                  Dumbbell],
  [['travel', 'flight', 'ticket', 'hotel'],             Plane],
  [['saving', 'invest', 'deposit'],                     PiggyBank],
  [['subscription', 'netflix', 'spotify', 'streaming'], Repeat],
]

export function getCategoryIcon(name = '', type = 'expense') {
  const n = String(name).toLowerCase()
  for (const [keywords, Icon] of ICON_RULES) {
    if (keywords.some(k => n.includes(k))) return Icon
  }
  return type === 'income' ? Banknote : Receipt
}
