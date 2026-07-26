export type Gallery = {
  id: string;
  title: string;
  client_name: string;
  client_email: string | null;
  gallery_code: string;
  active: boolean;
  expires_at: string | null;
  created_at: string;
};

export type Photo = {
  id: string;
  gallery_id: string;
  storage_path: string;
  original_filename: string;
  created_at: string;
};

export type GalleryPhoto = Photo & {
  viewUrl: string;
  downloadUrl: string;
  favoriteCount: number;
};

export type PortfolioPhoto = {
  id: string;
  storage_path: string;
  original_filename: string;
  title: string | null;
  description: string | null;
  category: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
};

export type PortfolioPhotoWithUrl = PortfolioPhoto & {
  imageUrl: string;
  likeCount: number;
};
