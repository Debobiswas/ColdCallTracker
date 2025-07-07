# JSON Uploader Test Data

This directory contains test JSON files for validating the JSON uploader functionality.

## Test Files

### 1. `valid-businesses.json`
Contains 5 valid business entries that should be successfully uploaded:
- All have required fields (title, phone, reviewsCount >= 20)
- Various phone number formats
- Different address formats (full address vs. street/city/state)
- All have good review counts
- None match excluded keywords

**Expected Result**: All 5 businesses should be added successfully.

### 2. `edge-cases.json`
Contains 8 business entries designed to test filtering logic:
- 1 business without phone number (should be skipped)
- 1 business with < 20 reviews (should be skipped)
- 3 businesses with excluded keywords (Gas Station, ATM, Parking - should be skipped)
- 1 business with exactly 20 reviews (should be included)
- 1 business without reviewsCount (should be skipped)
- 1 business with minimal data but valid (should be included)

**Expected Result**: 2 businesses added, 6 skipped with specific reasons.

### 3. `format-variations.json`
Contains 7 business entries with various data format variations:
- Numeric vs string phone numbers
- Mixed address formats
- Unicode characters
- Long descriptions
- Empty arrays
- Missing optional fields

**Expected Result**: All 7 businesses should be added (all meet minimum requirements).

## Usage

### Manual Testing
1. Go to your deployed application
2. Navigate to the businesses section
3. Use the "Import JSON" button
4. Upload each test file individually
5. Configure settings as needed:
   - Industry: "Restaurant" (or specific category)
   - Minimum reviews: 20
   - Exclude keywords: "gas station,atm,parking"
6. Verify the results match expectations

### Automated Testing
Run the test script:
```bash
npm install
npm test
```

## Test Scenarios

### Scenario 1: Valid Data Upload
- File: `valid-businesses.json`
- Settings: Default (20 min reviews, no excluded keywords)
- Expected: 5 businesses added, 0 skipped

### Scenario 2: Filtering Edge Cases
- File: `edge-cases.json`
- Settings: 20 min reviews, exclude "gas station,atm,parking"
- Expected: 2 businesses added, 6 skipped

### Scenario 3: Format Variations
- File: `format-variations.json`
- Settings: Default
- Expected: 7 businesses added, 0 skipped

### Scenario 4: Custom Settings
- File: `valid-businesses.json`
- Settings: 50 min reviews, exclude "coffee"
- Expected: 3 businesses added, 2 skipped

### Scenario 5: City Override
- File: `valid-businesses.json`
- Settings: City override = "Test City"
- Expected: All addresses should include "Test City"

## Validation Checklist

✅ **File Structure**
- [ ] All JSON files are valid JSON
- [ ] All files contain arrays of business objects
- [ ] Required fields are present where expected

✅ **API Integration**
- [ ] API health endpoint responds
- [ ] Business creation endpoint works
- [ ] Business retrieval endpoint works
- [ ] Error handling works correctly

✅ **Upload Logic**
- [ ] Phone number validation works
- [ ] Review count filtering works
- [ ] Keyword exclusion works
- [ ] Address formatting works
- [ ] Industry assignment works

✅ **Edge Cases**
- [ ] Missing required fields handled
- [ ] Invalid data formats handled
- [ ] Empty or malformed JSON handled
- [ ] Large file uploads work
- [ ] Network errors handled gracefully

## Expected Upload Results Summary

| File | Total | Added | Skipped | Skip Reasons |
|------|-------|-------|---------|--------------|
| valid-businesses.json | 5 | 5 | 0 | None |
| edge-cases.json | 8 | 2 | 6 | No phone (1), Low reviews (1), Excluded keywords (3), Missing reviewsCount (1) |
| format-variations.json | 7 | 7 | 0 | None |
| **TOTAL** | **20** | **14** | **6** | Various |

## Notes

- All test data uses fictitious business information
- Phone numbers use the 555 prefix (safe for testing)
- Addresses are realistic but fictional
- Review counts and ratings are artificial
- Test data covers common real-world scenarios 