CREATE TRIGGER review_rating_insert BEFORE INSERT ON Review
WHEN NEW.rating < 1 OR NEW.rating > 5 OR NEW.rating != CAST(NEW.rating AS INTEGER)
BEGIN SELECT RAISE(ABORT, 'rating must be an integer from 1 to 5'); END;
CREATE TRIGGER review_rating_update BEFORE UPDATE OF rating ON Review
WHEN NEW.rating < 1 OR NEW.rating > 5 OR NEW.rating != CAST(NEW.rating AS INTEGER)
BEGIN SELECT RAISE(ABORT, 'rating must be an integer from 1 to 5'); END;
CREATE TRIGGER campaign_dates_insert BEFORE INSERT ON Campaign
WHEN NEW.startDate > NEW.endDate
BEGIN SELECT RAISE(ABORT, 'invalid campaign dates'); END;
CREATE TRIGGER campaign_dates_update BEFORE UPDATE OF startDate,endDate ON Campaign
WHEN NEW.startDate > NEW.endDate
BEGIN SELECT RAISE(ABORT, 'invalid campaign dates'); END;
