ALTER TABLE user ADD COLUMN preferences TEXT DEFAULT '{"emailPatternAlerts":true,"emailBillingNotices":true,"emailTeamInvites":true,"emailWeeklyDigest":true}';
