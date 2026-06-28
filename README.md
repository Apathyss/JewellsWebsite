# Dustin Photo Sessions

A simple private client gallery site for small park photoshoots. It uses Next.js, TypeScript, Tailwind CSS, and Supabase for auth, database records, and private photo storage.

## What Works

- Public homepage for “Dustin Photo Sessions”
- Supabase email/password admin login at `/admin/login`
- Admin dashboard at `/admin`
- Create private client galleries with random hard-to-guess codes
- Upload multiple images to a private Supabase bucket
- Copy private gallery links like `/g/ABC123XYZ`
- Client gallery view with a phone-friendly grid
- Larger photo preview, individual downloads, and favorite hearts
- Gallery active/inactive toggle, optional expiry date, and gallery delete

`Download all` is intentionally left as a first-version TODO. Individual signed downloads work now.

## Local Setup

1. Make sure you have Node.js `18.17.0` or newer:

   ```bash
   node --version
   ```

   If this prints an older version, install a current LTS release from [nodejs.org](https://nodejs.org) before continuing.

2. Install pnpm if you do not already have it:

   ```bash
   npm install -g pnpm
   ```

3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Create a Supabase project at [supabase.com](https://supabase.com).

5. In Supabase, open **SQL Editor** and run:

   ```sql
   -- paste the contents of supabase/schema.sql
   ```

6. Create the storage bucket:

   - Go to **Storage**
   - Create a bucket named `gallery-photos`
   - Keep the bucket **private**
   - You do not need public storage policies for this starter app because the server creates signed URLs.

7. Create your admin auth user:

   - Go to **Authentication > Users**
   - Add a user with your email and password
   - Use this same email for `ADMIN_EMAIL`

8. Copy `.env.example` to `.env.local` and fill in the values:

   ```bash
   cp .env.example .env.local
   ```

   Put these Supabase values in `.env.local`:

   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase **Project URL**
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase **anon public** key
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase **service_role** key
   - `ADMIN_EMAIL`: the only email allowed to use `/admin`
   - `NEXT_PUBLIC_SITE_URL`: `http://localhost:3000` for local work

   Keep `SUPABASE_SERVICE_ROLE_KEY` secret. Never expose it in client-side code or commit `.env.local`.

9. Run the app:

   ```bash
   pnpm dev
   ```

10. Open:

   - Homepage: [http://localhost:3000](http://localhost:3000)
   - Admin: [http://localhost:3000/admin](http://localhost:3000/admin)

## How To Use It

1. Sign in at `/admin/login`.
2. Create a gallery with a title and client name.
3. Select that gallery in the upload box.
4. Upload one or more photos.
5. Copy the private link from the gallery list.
6. Send that link to the client.

Clients do not need accounts. Anyone with the private link can view that gallery while it is active and not expired.

## Supabase Privacy Notes

- Galleries are not listed publicly anywhere in the app.
- Gallery codes are random and hard to guess.
- The `gallery-photos` bucket should stay private.
- The database has row level security enabled and denies direct anon reads.
- Server-side Next.js API routes use the service role key to check gallery codes and create signed image URLs.
- Do not upload sensitive photos unless the client has given permission.

## Deploy To Vercel

1. Push this project to GitHub.
2. Import the repo in [Vercel](https://vercel.com).
3. Add the same environment variables from `.env.local` in **Project Settings > Environment Variables**.
4. Set `NEXT_PUBLIC_SITE_URL` to your production URL, for example:

   ```bash
   https://your-site.vercel.app
   ```

5. Deploy.

After deployment, sign in at `/admin`, create a gallery, upload photos, and test the copied private link in a private browser window.

## Future Improvements

- Zip-based `Download all`
- Per-client favorite identity instead of one shared favorite state per gallery
- Admin photo management screen with thumbnails
- Real contact form submission or booking calendar
- Email clients their private gallery link automatically
