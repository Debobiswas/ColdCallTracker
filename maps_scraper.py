import time
import random
import pandas as pd
import platform
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, StaleElementReferenceException
from webdriver_manager.chrome import ChromeDriverManager
from fake_useragent import UserAgent
from typing import List, Dict, Optional
import logging
from selenium.webdriver.common.keys import Keys

class GoogleMapsScraper:
    def __init__(self, headless: bool = True):
        """Initialize the scraper with browser settings."""
        self.setup_logging()
        self.setup_driver(headless)
        # Constants for scrolling behavior
        self.min_scrolls_per_batch = 25  # Minimum number of scrolls per batch
        self.max_consecutive_no_change = 3  # Maximum number of consecutive scrolls with no new results
        
    def setup_logging(self):
        """Configure logging for the scraper."""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)

    def setup_driver(self, headless: bool):
        """Set up the Chrome WebDriver with appropriate options."""
        try:
            chrome_options = Options()
            if headless:
                chrome_options.add_argument('--headless=new')
            
            # Add random user agent
            ua = UserAgent()
            chrome_options.add_argument(f'user-agent={ua.random}')
            
            # Additional options to avoid detection
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_experimental_option('excludeSwitches', ['enable-automation'])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            
            # Download ChromeDriver and ensure correct executable is used
            driver_path = ChromeDriverManager().install()
            self.logger.info(f"ChromeDriver installed at: {driver_path}")
            if platform.system() == "Windows":
                driver_dir = os.path.dirname(driver_path)
                for file in os.listdir(driver_dir):
                    if file.lower() == "chromedriver.exe":
                        driver_path = os.path.join(driver_dir, file)
                        break
            service = Service(driver_path)
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            self.driver.set_window_size(1920, 1080)
            self.driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
                'source': '''
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    })
                '''
            })
            self.logger.info("Chrome WebDriver initialized successfully")
        except Exception as e:
            self.logger.error(f"Failed to initialize Chrome WebDriver: {str(e)}")
            raise

    def search_businesses(self, location: str, business_type: str, target_results: int, 
                         filter_no_websites: bool = False) -> List[Dict]:
        """
        Search for businesses on Google Maps and return structured data.
        
        Args:
            location: City or area to search in
            business_type: Type of business to search for
            target_results: Target number of results to find
            filter_no_websites: If True, only return businesses WITHOUT websites
            
        Returns:
            List of dictionaries containing business information
        """
        search_query = f"{business_type} in {location}"
        self.logger.info(f"Searching for: {search_query}")
        
        # Directly navigate to Google Maps search results
        encoded_query = search_query.replace(' ', '+')
        search_url = f"https://www.google.com/maps/search/{encoded_query}"
        self.driver.get(search_url)
        time.sleep(5)  # Give more time for the page to load
        self.driver.save_screenshot("debug_search_results.png")
        self.logger.info(f"Navigated to search results: {search_url}")

        # Handle Google consent popup if present
        try:
            consent_buttons = self.driver.find_elements(By.XPATH, 
                '//button[contains(., "Accept all") or contains(., "I agree") or contains(., "Accept") or contains(., "Agree")]')
            if consent_buttons:
                consent_buttons[0].click()
                self.logger.info("Clicked Google consent popup.")
                time.sleep(2)
        except Exception as e:
            self.logger.info(f"No consent popup detected or error: {str(e)}")

        try:
            # Wait for the results container to be loaded
            results_selector = "//div[@role='feed' or @role='main' or contains(@class, 'section-result-content')]"
            WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.XPATH, results_selector))
            )
            
            businesses = []  # Final list of businesses that match criteria
            processed_urls = set()  # Track processed URLs to avoid duplicates
            all_collected_urls = []  # Keep track of all URLs we've collected
            
            # Find the scrollable element
            scrollable_element = None
            for selector in ["div[role='feed']", "div.section-layout", "div[jsaction*='mouseover']"]:
                try:
                    scrollable_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    self.logger.info(f"Found scrollable element with selector: {selector}")
                    break
                except:
                    continue
                    
            if not scrollable_element:
                # Fallback to body if no specific scrollable element is found
                scrollable_element = self.driver.find_element(By.TAG_NAME, "body")
                self.logger.info("Using document body as scrollable element")
            
            # Setup for batch processing
            batch_size = 20  # Process in batches of 20
            scroll_attempts = 0
            max_scroll_attempts = 50
            consecutive_no_change = 0
            wait_times = [2, 3, 4]
            reached_end = False
            total_batches_processed = 0
            
            while len(businesses) < target_results and not reached_end:
                # STEP 1: Loading a new batch of businesses
                self.logger.info(f"STEP 1: Loading a new batch of businesses... (total scroll attempts so far: {scroll_attempts})")
                batch_urls = []
                batch_attempts = 0
                last_url_count = len(processed_urls)
                
                # Make sure we're on the search results page
                if '/maps/search/' not in self.driver.current_url:
                    self.logger.info("Not on search results page. Navigating back to search URL.")
                    self.driver.get(search_url)
                    time.sleep(5)
                
                # Keep scrolling until we have batch_size new URLs or can't find more
                scroll_count_this_batch = 0
                min_scrolls_per_batch = self.min_scrolls_per_batch  # Minimum number of scrolls before giving up on this batch
                
                while len(batch_urls) < batch_size and batch_attempts < 10 and (consecutive_no_change < self.max_consecutive_no_change or scroll_count_this_batch < min_scrolls_per_batch):
                    # Take a screenshot occasionally for debugging
                    if scroll_attempts % 10 == 0:
                        self.driver.save_screenshot(f"debug_scroll_{scroll_attempts}.png")
                    
                    # Get current height for comparison after scrolling
                    try:
                        current_height = self.driver.execute_script("return document.body.scrollHeight")
                    except Exception as e:
                        self.logger.error(f"Error getting page height: {str(e)}")
                        current_height = 0
                    
                    # Collect URLs before scrolling
                    try:
                        new_urls = []
                        found_urls = self._collect_place_urls(new_urls, processed_urls)
                        
                        # Add only URLs we haven't processed before
                        for url in new_urls:
                            if url not in all_collected_urls:
                                batch_urls.append(url)
                                all_collected_urls.append(url)
                        
                        self.logger.info(f"Found {len(new_urls)} new URLs in this scroll, batch now has {len(batch_urls)}")
                    except Exception as e:
                        self.logger.error(f"Error collecting URLs: {str(e)}")
                        # Try to refresh the page if we encounter errors
                        if batch_attempts > 3 and len(batch_urls) == 0:
                            self.logger.info("Refreshing page to attempt to fix collection issues")
                            self.driver.get(search_url)
                            time.sleep(5)
                    
                    # Perform scrolling action
                    try:
                        # Try to find the scrollable element again if needed
                        try:
                            if not scrollable_element or scrollable_element.is_stale():
                                for selector in ["div[role='feed']", "div.section-layout", "div[jsaction*='mouseover']"]:
                                    try:
                                        scrollable_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                                        self.logger.info(f"Found scrollable element again with selector: {selector}")
                                        break
                                    except:
                                        continue
                                
                                if not scrollable_element:
                                    scrollable_element = self.driver.find_element(By.TAG_NAME, "body")
                        except:
                            # If we can't check if it's stale, just try to find it again
                            for selector in ["div[role='feed']", "div.section-layout", "div[jsaction*='mouseover']"]:
                                try:
                                    scrollable_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                                    break
                                except:
                                    continue
                            
                            if not scrollable_element:
                                scrollable_element = self.driver.find_element(By.TAG_NAME, "body")
                        
                        # Perform the actual scroll
                        if scrollable_element.tag_name == "body":
                            # Scroll the entire page
                            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                        else:
                            # Scroll the specific element
                            self.driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight", scrollable_element)
                            
                            # Alternative scrolling methods if needed
                            try:
                                # Send PAGE_DOWN key to the element
                                scrollable_element.send_keys(Keys.PAGE_DOWN)
                            except:
                                pass
                    except Exception as e:
                        self.logger.error(f"Error during scrolling: {str(e)}")
                    
                    # Random wait after scrolling to allow content to load
                    time.sleep(random.choice(wait_times))
                    
                    # Check if more results loaded by comparing heights
                    try:
                        new_height = self.driver.execute_script("return document.body.scrollHeight")
                    except:
                        new_height = current_height  # Default to current height if there's an error
                    
                    # Check if we found new URLs
                    if len(batch_urls) == last_url_count:
                        consecutive_no_change += 1
                        self.logger.info(f"No new URLs found after scroll. Attempt {consecutive_no_change}/{self.max_consecutive_no_change} (scrolls this batch: {scroll_count_this_batch+1}/{min_scrolls_per_batch})")
                        
                        # Try clicking "Show more results" button if it exists
                        try:
                            show_more_buttons = self.driver.find_elements(By.XPATH, 
                                "//button[contains(., 'Show more') or contains(., 'See more') or contains(., 'Load more')]")
                            if show_more_buttons:
                                show_more_buttons[0].click()
                                self.logger.info("Clicked 'Show more' button")
                                time.sleep(3)  # Wait for new results to load
                                consecutive_no_change = 0  # Reset counter
                        except Exception as e:
                            self.logger.info(f"No 'Show more' button found or error: {str(e)}")
                    else:
                        consecutive_no_change = 0
                        
                    last_url_count = len(batch_urls)
                    scroll_attempts += 1
                    scroll_count_this_batch += 1
                    batch_attempts += 1
                    
                    # If we've scrolled the minimum number of times for this batch and still no change, we might be at the end
                    if scroll_count_this_batch >= min_scrolls_per_batch and consecutive_no_change >= self.max_consecutive_no_change:
                        self.logger.info(f"Reached minimum scroll attempts for this batch ({min_scrolls_per_batch}) with no new results after {consecutive_no_change} consecutive attempts")
                        
                        # Check specifically for "You've reached the end of the list" message
                        try:
                            # Use a more reliable XPath that avoids apostrophes which can cause issues
                            end_of_list_xpath = "//*[contains(text(), 'reached the end') or contains(text(), 'No more results')]"
                            end_of_list_messages = self.driver.find_elements(By.XPATH, end_of_list_xpath)
                            if end_of_list_messages:
                                self.logger.info("Found 'You've reached the end of the list' message. Truly at the end.")
                                reached_end = True
                                break
                            else:
                                # If we don't see the message but have scrolled enough, consider it the end of this batch
                                if scroll_count_this_batch >= min_scrolls_per_batch:
                                    self.logger.info(f"Completed minimum {min_scrolls_per_batch} scrolls for this batch. Moving to processing.")
                                    break
                                else:
                                    # Try one more scroll
                                    self.logger.info("No end of list message found. Continuing to scroll.")
                        except Exception as e:
                            self.logger.error(f"Error checking for end of list message: {str(e)}")
                            # If we've reached min scrolls, move on
                            if scroll_count_this_batch >= min_scrolls_per_batch:
                                self.logger.info(f"Completed minimum {min_scrolls_per_batch} scrolls for this batch. Moving to processing.")
                                break
                
                # Check if we found any new URLs in this batch
                if not batch_urls:
                    # If we didn't find any URLs in this batch, try refreshing the search
                    self.logger.info("Couldn't find any new business URLs. Trying to refresh search.")
                    try:
                        self.driver.get(search_url)
                        time.sleep(5)
                        
                        # Try one more time to collect URLs after refresh
                        new_urls = []
                        self._collect_place_urls(new_urls, processed_urls)
                        
                        # Add only URLs we haven't processed before
                        for url in new_urls:
                            if url not in all_collected_urls:
                                batch_urls.append(url)
                                all_collected_urls.append(url)
                        
                        if not batch_urls:
                            # Check specifically for "You've reached the end of the list" message
                            try:
                                # Use a more reliable XPath that avoids apostrophes which can cause issues
                                end_of_list_xpath = "//*[contains(text(), 'reached the end') or contains(text(), 'No more results')]"
                                end_of_list_messages = self.driver.find_elements(By.XPATH, end_of_list_xpath)
                                if end_of_list_messages:
                                    self.logger.info("Found 'You've reached the end of the list' message. Truly at the end.")
                                    reached_end = True
                                else:
                                    self.logger.info("No end of list message found, but no more URLs available.")
                                    # Try one last scroll with the minimum number of attempts
                                    self.logger.info(f"Performing final batch of scrolls (min {self.min_scrolls_per_batch} attempts)...")
                                    
                                    # Perform the minimum number of scrolls
                                    final_scroll_count = 0
                                    while final_scroll_count < self.min_scrolls_per_batch:
                                        self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                                        time.sleep(3)
                                        scroll_attempts += 1
                                        final_scroll_count += 1
                                        
                                        if final_scroll_count % 5 == 0:
                                            self.logger.info(f"Final scroll attempt {final_scroll_count}/{self.min_scrolls_per_batch}")
                                            # Try to collect URLs again
                                            new_urls = []
                                            self._collect_place_urls(new_urls, processed_urls)
                                            for url in new_urls:
                                                if url not in all_collected_urls:
                                                    batch_urls.append(url)
                                                    all_collected_urls.append(url)
                                            
                                            if batch_urls:
                                                self.logger.info(f"Found {len(batch_urls)} URLs after additional scrolling!")
                                                break
                                    
                                    if not batch_urls:
                                        self.logger.info(f"Still no new URLs after {final_scroll_count} additional scroll attempts. End of results reached.")
                                        reached_end = True
                            except Exception as e:
                                self.logger.error(f"Error checking for end of list message: {str(e)}")
                                self.logger.info("Still no new URLs after refresh. End of results reached.")
                                reached_end = True
                            break
                        else:
                            self.logger.info(f"Found {len(batch_urls)} URLs after refreshing search.")
                    except Exception as e:
                        self.logger.error(f"Error refreshing search: {str(e)}")
                        reached_end = True
                        break
                
                # STEP 2: Process the batch of URLs and check if they can be selected
                self.logger.info(f"STEP 2: Processing batch of {len(batch_urls)} URLs...")
                matched_in_batch = 0
                
                for i, url in enumerate(batch_urls):
                    try:
                        # Navigate to the place page
                        self.logger.info(f"Processing URL {i+1}/{len(batch_urls)}: {url}")
                        self.driver.get(url)
                        time.sleep(3)
                        
                        # Extract business information
                        business_info = self._extract_business_info()
                        
                        if business_info:
                            # Check if we should include this business based on website filter
                            website_value = business_info.get('website', 'N/A')
                            has_website = business_info.get('has_website', False)
                            is_social_media = business_info.get('is_social_media', False)
                            
                            # Log detailed information about the business
                            self.logger.info(f"Business details for '{business_info['name']}': website={website_value}, has_website={has_website}, is_social_media={is_social_media}")
                            
                            filter_match = (filter_no_websites and not has_website) or (not filter_no_websites)
                            
                            # Add business to results if it matches filter criteria
                            if filter_match:
                                businesses.append(business_info)
                                matched_in_batch += 1
                                status = "NO WEBSITE" if not has_website else "has website"
                                social_media_status = " (social media only)" if is_social_media else ""
                                self.logger.info(f"Found matching business: {business_info['name']} ({status}{social_media_status})")
                                
                                # Check if we've found enough businesses
                                if len(businesses) >= target_results:
                                    self.logger.info(f"Reached target of {target_results} businesses!")
                                    break
                            else:
                                self.logger.info(f"Skipping business: {business_info['name']} (has website: {has_website}, filter for no websites: {filter_no_websites})")
                    except Exception as e:
                        self.logger.error(f"Error processing URL {url}: {str(e)}")
                
                # STEP 3: Check if we need to load more
                self.logger.info(f"STEP 3: Batch processing complete. Found {matched_in_batch} matching businesses in this batch.")
                self.logger.info(f"Total matching businesses so far: {len(businesses)}/{target_results}")
                total_batches_processed += 1
                
                if len(businesses) < target_results:
                    if reached_end:
                        self.logger.info(f"End of all results reached after {scroll_attempts} scroll attempts. Can't find more businesses.")
                    else:
                        self.logger.info("Need more results. Loading next batch...")
                else:
                    self.logger.info(f"Found all {target_results} requested businesses!")
            
            # Final results summary
            if businesses:
                self.logger.info(f"Successfully found {len(businesses)} businesses that match criteria")
                if len(businesses) < target_results:
                    if reached_end:
                        self.logger.warning(f"Reached the end of available results. Only found {len(businesses)} businesses out of the {target_results} requested.")
                    else:
                        self.logger.warning(f"Processed all collected URLs but only found {len(businesses)} businesses out of the {target_results} requested.")
            else:
                self.logger.error("No businesses found that match the criteria after processing all available listings.")
                
            return businesses
            
        except Exception as e:
            self.logger.error(f"Error during search: {str(e)}")
            self.driver.save_screenshot("debug_error.png")
            return []

    def _collect_place_urls(self, all_place_urls: list, processed_urls: set):
        """Helper method to collect place URLs from the current view."""
        # Try multiple different selectors for place links
        selectors = [
            "//a[contains(@href, '/maps/place/')]",
            "//div[@role='article']//a[contains(@href, '/maps/place/')]",
            "//div[contains(@jsaction, 'mouseover')]//a[contains(@href, '/maps/place/')]",
            "//div[@role='feed']//a[contains(@href, '/maps/place/')]",
            "//div[contains(@class, 'section-result')]//a[contains(@href, '/maps/place/')]"
        ]
        
        found_elements = False
        for selector in selectors:
            try:
                # Use find_elements directly instead of waiting, which can cause timeouts
                elements = self.driver.find_elements(By.XPATH, selector)
                
                if elements:
                    found_elements = True
                    self.logger.info(f"Found {len(elements)} elements with selector: {selector}")
                    
                    # Extract URLs with retries for stale elements
                    for element in elements:
                        for attempt in range(3):  # Try up to 3 times for each element
                            try:
                                url = element.get_attribute('href')
                                if url and '/maps/place/' in url and url not in processed_urls:
                                    all_place_urls.append(url)
                                    processed_urls.add(url)
                                break  # Break the retry loop if successful
                            except StaleElementReferenceException:
                                if attempt < 2:  # Don't log on last attempt
                                    self.logger.info(f"Stale element encountered, retrying... (attempt {attempt+1}/3)")
                                    time.sleep(0.5)
                                    continue
                                else:
                                    self.logger.warning("Element remained stale after retries, skipping")
                            except Exception as e:
                                self.logger.error(f"Error extracting URL: {str(e)}")
                                break
                    
                    # If we found elements with this selector, no need to try others
                    if elements:
                        break
            except Exception as e:
                self.logger.error(f"Error with selector {selector}: {str(e)}")
        
        if not found_elements:
            self.logger.warning("No elements found with any selector")
            
        return len(all_place_urls) > 0  # Return True if we found any new URLs

    def _extract_business_info(self) -> Optional[Dict]:
        """Extract business information from the current listing."""
        try:
            # Wait for the business details panel to load
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'div[role="dialog"]'))
            )
            
            # Take a screenshot of the business details
            self.driver.save_screenshot("debug_business_details.png")
            
            # Extract business name (try multiple selectors)
            name = "N/A"
            name_selectors = [
                'h1',
                'h1.section-hero-header-title',
                'div[role="heading"]',
                'div.fontHeadlineLarge'
            ]
            
            for selector in name_selectors:
                try:
                    name_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    name = name_element.text
                    if name:
                        break
                except:
                    continue
            
            # Extract address (try multiple selectors)
            address = "N/A"
            address_selectors = [
                'button[data-item-id="address"]',
                'button[aria-label*="Address"]',
                'button[jsan*="address"]',
                'div[data-tooltip="Copy address"]',
                'button[data-tooltip="Copy address"]'
            ]
            
            for selector in address_selectors:
                try:
                    address_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    address = address_element.text
                    if address:
                        break
                except:
                    continue
            
            # Extract phone number (try multiple selectors)
            phone = "N/A"
            phone_selectors = [
                'button[data-item-id="phone:tel:"]',
                'button[aria-label*="Phone"]',
                'button[aria-label*="phone"]',
                'button[data-tooltip="Copy phone number"]',
                'div[data-tooltip="Copy phone number"]'
            ]
            
            for selector in phone_selectors:
                try:
                    phone_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    phone = phone_element.text
                    if phone:
                        break
                except:
                    continue
            
            # Extract website (try multiple selectors)
            website = "N/A"
            has_website = False
            website_selectors = [
                'a[data-item-id="authority"]',
                'a[aria-label*="website"]',
                'a[href^="http"][data-item-id]',
                'a[data-tooltip="Open website"]',
                'div[data-tooltip="Open website"] a'
            ]
            
            # First check if we can find any website elements
            website_elements = []
            for selector in website_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    if elements:
                        website_elements.extend(elements)
                except Exception as e:
                    self.logger.error(f"Error finding website elements with selector {selector}: {str(e)}")
            
            self.logger.info(f"Found {len(website_elements)} website elements for business '{name}'")
            
            # Try to determine if there's explicitly no website
            no_website_indicators = False
            try:
                # Check if there are any elements that might indicate no website
                # This is a heuristic approach - we're looking for buttons that might be "Add website" or similar
                add_website_buttons = self.driver.find_elements(By.XPATH, 
                    "//button[contains(., 'Add website') or contains(., 'Suggest a website')]")
                
                # Check for "Claim this business" links which often appear for businesses without websites
                claim_business_links = self.driver.find_elements(By.XPATH,
                    "//a[contains(., 'Claim this business') or contains(., 'Own this business?')]")
                
                if add_website_buttons:
                    self.logger.info(f"Found 'Add website' button for business '{name}' - likely has no website")
                    no_website_indicators = True
                
                if claim_business_links:
                    self.logger.info(f"Found 'Claim this business' link for business '{name}' - might have no website")
                    # This is a weaker indicator, so we'll only set it if we don't have other indicators
                    if not no_website_indicators and not website_elements:
                        no_website_indicators = True
                
                # Another approach: check if the business info section doesn't contain website info
                # First, try to get all buttons/links in the business info panel
                info_elements = self.driver.find_elements(By.CSS_SELECTOR, 
                    'button[data-item-id], a[data-item-id]')
                
                # Log what info elements we found
                info_types = [elem.get_attribute('data-item-id') for elem in info_elements]
                self.logger.info(f"Business info elements found: {info_types}")
                
                # If we have info elements but none for website, that's another indicator
                if info_elements and not any('website' in elem.get_attribute('data-item-id') or 
                                           'authority' in elem.get_attribute('data-item-id') 
                                           for elem in info_elements):
                    self.logger.info(f"Business info panel doesn't contain website element for '{name}'")
                    no_website_indicators = True
                
                # Take a screenshot of the entire page for debugging
                self.driver.save_screenshot(f"debug_full_{name.replace(' ', '_')[:20]}.png")
                
            except Exception as e:
                self.logger.error(f"Error checking for no-website indicators: {str(e)}")
            
            # If we found website elements, process them
            if website_elements:
                website_element = website_elements[0]
                website = website_element.get_attribute('href')
                if website:
                    # Check if it's a Google Business Profile link (not a real website)
                    google_business_patterns = [
                        'business.google.com', 
                        'business.site', 
                        'gmbsrc=', 
                        'getstarted', 
                        'business.profile'
                    ]
                    
                    is_google_business = any(pattern in website.lower() for pattern in google_business_patterns)
                    
                    if is_google_business:
                        self.logger.info(f"Found Google Business Profile link instead of website: {website}")
                        has_website = False
                        website = f"GOOGLE_BUSINESS:{website}"
                    # Check if the website is a social media link
                    elif not website.startswith('https://www.google.com'):
                        social_media_domains = ['facebook.com', 'fb.com', 'instagram.com', 'twitter.com', 'x.com']
                        is_social_media = any(domain in website.lower() for domain in social_media_domains)
                        
                        if is_social_media:
                            self.logger.info(f"Found social media link instead of website: {website}")
                            has_website = False  # Consider social media links as having no website
                            # Keep the URL for reference but mark it as a social media link
                            website = f"SOCIAL_MEDIA:{website}"
                        else:
                            has_website = True
            else:
                # No website elements found
                self.logger.info(f"No website elements found for business '{name}'")
                website = "N/A"
                has_website = False
            
            # Additional check to verify if website exists
            if website == "N/A" or website.startswith("SOCIAL_MEDIA:") or website.startswith("GOOGLE_BUSINESS:") or no_website_indicators:
                self.logger.info(f"Business '{name}' has NO website")
                has_website = False
            else:
                self.logger.info(f"Business '{name}' has website: {website}")
                has_website = True
            
            # Get Google Maps link
            maps_link = self.driver.current_url
            
            # Take a screenshot of the business details with a unique name
            screenshot_name = f"debug_{name.replace(' ', '_')[:20]}.png"
            self.driver.save_screenshot(screenshot_name)
            
            return {
                'name': name,
                'address': address,
                'phone': phone,
                'website': website if not website.startswith("SOCIAL_MEDIA:") else website[12:],  # Remove the prefix but keep the URL
                'maps_link': maps_link,
                'has_website': has_website,
                'is_social_media': website.startswith("SOCIAL_MEDIA:") if website != "N/A" else False
            }
            
        except Exception as e:
            self.logger.error(f"Error extracting business info: {str(e)}")
            return None

    def export_to_csv(self, businesses: List[Dict], filename: str = 'businesses.csv'):
        """Export the business data to a CSV file."""
        # Add a website_type column
        for business in businesses:
            website = business.get('website', 'N/A')
            if website == 'N/A':
                business['website_type'] = 'None'
            elif business.get('is_social_media', False):
                business['website_type'] = 'Social Media'
            elif 'GOOGLE_BUSINESS:' in website:
                business['website_type'] = 'Google Business'
                # Clean up the website URL
                business['website'] = website.replace('GOOGLE_BUSINESS:', '')
            else:
                business['website_type'] = 'Regular Website'
                
        df = pd.DataFrame(businesses)
        df.to_csv(filename, index=False)
        self.logger.info(f"Data exported to {filename}")

    def close(self):
        """Close the browser and clean up."""
        self.driver.quit()

def main():
    try:
        print("\n===== Google Maps Business Scraper =====")
        print("This tool scrapes business information from Google Maps for lead generation.")
        
        # Get user input with examples
        print("\nPlease provide the following information:")
        
        # Business type input
        print("\nBusiness Type Examples: 'barbershop', 'restaurant', 'dentist', 'plumber'")
        business_type = input("Enter business type: ").strip()
        while not business_type:
            business_type = input("Business type cannot be empty. Please enter a business type: ").strip()
        
        # Location input
        print("\nLocation Examples: 'Montreal, QC', 'New York, NY', 'London, UK', 'Sydney, Australia'")
        location = input("Enter location: ").strip()
        while not location:
            location = input("Location cannot be empty. Please enter a location: ").strip()
        
        # Target results input
        print("\nNumber of Results: The scraper will FIND exactly this many businesses matching your filter criteria")
        print("Note: It will continue searching until it finds the requested number or exhausts all available results")
        target_results = 50  # Default value
        try:
            target_results_input = input("Enter number of businesses to find (default: 50): ").strip()
            if target_results_input:
                target_results = int(target_results_input)
                if target_results < 1:
                    print("Number must be at least 1. Using default: 50")
                    target_results = 50
                elif target_results > 100:
                    print("Warning: Large numbers may take a long time. Maximum is 100.")
                    target_results = min(target_results, 100)
        except ValueError:
            print("Invalid input. Using default: 50")
        
        # Filter for NO websites
        print("\nFilter Option: You can choose to only return businesses WITHOUT websites")
        print("Note: Businesses with ONLY social media links (Facebook, Instagram, Twitter, etc.) or")
        print("      Google Business Profile links are counted as having NO website")
        filter_no_websites = False  # Default to False
        filter_input = input("Return 'NO WEBSITES' only? (y/n): ").strip().lower()
        if filter_input and filter_input[0] == 'y':
            filter_no_websites = True
            print("Will only return businesses WITHOUT websites (including those with only social media or Google Business links).")
        else:
            print("Will return ALL businesses regardless of website availability.")
        
        # Headless mode input
        print("\nBrowser Visibility: Run with visible browser or hidden? (visible/hidden)")
        print("- Visible: You can see the browser as it works (good for debugging)")
        print("- Hidden: Browser runs in the background (faster and doesn't interfere with your work)")
        headless = True  # Default to headless (hidden)
        headless_input = input("Run with visible or hidden browser? (v/h, default: h): ").strip().lower()
        if headless_input and headless_input[0] == 'v':
            headless = False
            print("Running with visible browser.")
        else:
            print("Running with hidden browser.")
            
        # Display search parameters
        print(f"\nSearching for '{business_type}' in '{location}'...")
        print(f"Target number of businesses: {target_results}, Filter for NO websites: {'Yes' if filter_no_websites else 'No'}\n")
        
        # Run the scraper
        print("Initializing the scraper (this may take a moment)...")
        scraper = GoogleMapsScraper(headless=headless)
        try:
            businesses = scraper.search_businesses(
                location=location,
                business_type=business_type,
                target_results=target_results,
                filter_no_websites=filter_no_websites
            )
            
            if businesses:
                # Generate a meaningful filename with date
                from datetime import datetime
                date_str = datetime.now().strftime("%Y%m%d_%H%M")
                safe_business_type = ''.join(c if c.isalnum() else '_' for c in business_type)
                safe_location = ''.join(c if c.isalnum() or c == '_' else '_' for c in location.replace(', ', '_').replace(' ', '_'))
                filename = f"{safe_business_type}_{safe_location}_{date_str}.csv"
                
                # Export to CSV
                scraper.export_to_csv(businesses, filename)
                
                # Count businesses with websites vs without
                with_websites = sum(1 for b in businesses if b.get('website') and b.get('website') != "N/A")
                without_websites = len(businesses) - with_websites
                
                # Print summary
                print(f"\n=== RESULTS SUMMARY ===")
                print(f"Total businesses found: {len(businesses)}")
                if len(businesses) < target_results:
                    print(f"Note: Only found {len(businesses)} matching businesses out of the {target_results} requested.")
                    print("This is likely all that's available in this area with your current filter settings.")
                
                if len(businesses) > 0:
                    print(f"Businesses WITH websites: {with_websites} ({with_websites/len(businesses)*100:.1f}%)")
                    print(f"Businesses WITHOUT websites: {without_websites} ({without_websites/len(businesses)*100:.1f}%)")
                print(f"Data exported to: {filename}")
                print(f"===========================\n")
            else:
                print("\nNo businesses found that match your criteria. Try with different search parameters or filters.")
                
        finally:
            scraper.close()
    
    except KeyboardInterrupt:
        print("\n\nSearch interrupted by user. Exiting...")
    except Exception as e:
        print(f"\n\nAn error occurred: {str(e)}")
        print("Please try again or check your inputs.")

if __name__ == "__main__":
    main() 