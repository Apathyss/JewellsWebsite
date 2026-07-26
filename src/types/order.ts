export type Order = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  session_type: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  location: string | null;
  message: string;
  status: string;
  created_at: string;
};
