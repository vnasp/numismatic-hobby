alter table coins_regions
  add column if not exists visible_in_selector boolean not null default true;