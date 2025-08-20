export interface CarouselCard {
  icon: string;
  titleKey: string;
  descriptionKey: string;
  isComingSoon?: boolean;
  route?: string;
}

export interface CarouselSlide {
  id: string;
  cards: CarouselCard[];
}

export interface CarouselConfig {
  autoSlideInterval: number; // in milliseconds
  slides: CarouselSlide[];
}
