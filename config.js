/* Akumen Talent settings. Leave a value as YOUR_... to switch that feature off.

   1. Microsoft sign-in (no Supabase needed)
      Paste the Application (client) ID and Directory (tenant) ID from your Azure app registration.
      People sign in with Microsoft; records stay in each browser. See README → "Microsoft sign-in". */
const MS_CLIENT_ID = '9b4762d9-5b44-43d7-a83c-4911d159412d';
const MS_TENANT_ID = '5b8a9705-4add-48e5-9c65-533a48db3e18';

/* 2. Team mode (shared data for everyone, Microsoft sign-in through Supabase)
      Paste the two values from Supabase > Project Settings > API. The anon key is safe to publish;
      access is protected by sign-in and the rules in schema.sql. When these are filled in, they are
      used instead of the Microsoft settings above. */
const SB_URL = 'https://lqekyhqbojmsqbfvjeri.supabase.co';
const SB_KEY = 'sb_publishable_S9O2o7P8xQ-N_n2mWaWAvg_j83L6kCt';
