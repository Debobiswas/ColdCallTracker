import unittest
import pandas as pd
import os
from fastapi.testclient import TestClient
from api import app

class TestAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        # Create a test Excel file
        self.test_data = {
            'Name': ['Test Business A', 'Test Business B'],
            'Status': ['tocall', 'called'],
            'Number': ['123-456-7890', '098-765-4321'],
            'Address': ['123 Test St', '456 Test Ave'],
            'Comments': ['Test comment', 'Another test comment']
        }
        self.test_df = pd.DataFrame(self.test_data)
        self.test_df.to_excel('test_data.xlsx', index=False)

    def tearDown(self):
        # Clean up test files
        if os.path.exists('test_data.xlsx'):
            os.remove('test_data.xlsx')

    def test_get_all_businesses(self):
        response = self.client.get("/api/businesses")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)

    def test_get_businesses_by_status(self):
        # Test valid status
        response = self.client.get("/api/businesses/tocall")
        self.assertEqual(response.status_code, 200)
        
        # Test invalid status
        response = self.client.get("/api/businesses/invalid_status")
        self.assertEqual(response.status_code, 400)

    def test_update_business(self):
        # Test updating with valid status
        response = self.client.put(
            "/api/businesses/Test%20Business%20A",
            json={"status": "called"}
        )
        self.assertEqual(response.status_code, 200)

        # Test updating with invalid status
        response = self.client.put(
            "/api/businesses/Test%20Business%20A",
            json={"status": "invalid_status"}
        )
        self.assertEqual(response.status_code, 400)

        # Test updating non-existent business
        response = self.client.put(
            "/api/businesses/NonExistentBusiness",
            json={"status": "called"}
        )
        self.assertEqual(response.status_code, 404)

    def test_file_upload(self):
        # Test valid Excel file
        with open('test_data.xlsx', 'rb') as f:
            response = self.client.post(
                "/api/upload",
                files={"file": ("test.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
            )
            self.assertEqual(response.status_code, 200)

        # Test invalid file type
        response = self.client.post(
            "/api/upload",
            files={"file": ("test.txt", b"test content", "text/plain")}
        )
        self.assertEqual(response.status_code, 400)

        # Test Excel file with missing required columns
        invalid_df = pd.DataFrame({'InvalidColumn': ['test']})
        invalid_df.to_excel('invalid_test.xlsx', index=False)
        with open('invalid_test.xlsx', 'rb') as f:
            response = self.client.post(
                "/api/upload",
                files={"file": ("invalid_test.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
            )
            self.assertEqual(response.status_code, 400)
        os.remove('invalid_test.xlsx')

        # Test Excel file with invalid status values
        invalid_status_df = pd.DataFrame({
            'Name': ['Test'],
            'Status': ['invalid_status']
        })
        invalid_status_df.to_excel('invalid_status.xlsx', index=False)
        with open('invalid_status.xlsx', 'rb') as f:
            response = self.client.post(
                "/api/upload",
                files={"file": ("invalid_status.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
            )
            self.assertEqual(response.status_code, 400)
        os.remove('invalid_status.xlsx')

if __name__ == '__main__':
    unittest.main() 