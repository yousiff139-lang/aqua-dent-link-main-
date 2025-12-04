-- Delete ALL fake patients, keep only the real user: yousiff139@gmail.com

DELETE FROM profiles
WHERE role = 'patient'
AND email != 'yousiff139@gmail.com';

-- Verify - should only show 1 user now:
SELECT id, full_name, email FROM profiles WHERE role = 'patient';
