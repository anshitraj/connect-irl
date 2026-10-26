-- Official event data only. Never seed sample profiles into public discovery.
insert into public.events(id,slug,name,starts_on,ends_on,website,source_url,verified_at,organizer,description) values
('devcon-8','devcon-8-india','Devcon 8 India','2026-11-03','2026-11-06','https://devcon.org/en/','https://devcon.org/en/travel-guide/','2026-10-25T00:00:00+05:30','Ethereum Foundation','Four days with the people building free, open, private, and verifiable systems.'),
('ibw-2026','india-blockchain-week-2026','India Blockchain Week','2026-11-01','2026-11-02','https://indiablockchainweek.com/','https://indiablockchainweek.com/','2026-10-25T00:00:00+05:30','Hashed Emergent','India’s flagship gathering for builders, founders, and investors.'),
('solana-2026','solana-summit-india-2026','Solana Summit India','2026-11-02','2026-11-02','https://www.solanasummit.in/','https://www.solanasummit.in/','2026-10-25T00:00:00+05:30','Superteam India','A day of talks and workshops for founders, developers, and creatives building on Solana.'),
('ethglobal-2026','ethglobal-mumbai-2026','ETHGlobal Mumbai','2026-11-05','2026-11-07','https://ethglobal.com/events/mumbai','https://ethglobal.com/events','2026-10-26T00:00:00+05:30','ETHGlobal','Three days of hacking with Ethereum builders from across India and the world, the same week as Devcon.')
on conflict(id) do update set starts_on=excluded.starts_on,ends_on=excluded.ends_on,source_url=excluded.source_url,verified_at=excluded.verified_at;
insert into public.event_venues(event_id,name,address,city,longitude,latitude) values
('devcon-8','Jio World Convention Centre','G Block, Bandra Kurla Complex, Bandra East, Mumbai 400051','Mumbai',72.8785,19.0632),
('ibw-2026','Fairmont Mumbai','Terminal 2, Chhatrapati Shivaji Maharaj International Airport, Mumbai 400099','Mumbai',72.8745,19.1013),
('solana-2026','JW Marriott Mumbai Sahar','IA Project Road, Andheri East, Mumbai 400099','Mumbai',72.8781,19.1035),
('ethglobal-2026','Jio World Convention Centre','G Block, Bandra Kurla Complex, Bandra East, Mumbai 400051','Mumbai',72.8790,19.0636)
on conflict(event_id) do update set name=excluded.name,address=excluded.address,longitude=excluded.longitude,latitude=excluded.latitude;
