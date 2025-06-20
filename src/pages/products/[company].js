import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '../../components/forecasting/layout/AppLayout';
import LoadingSpinner from '../../components/forecasting/common/LoadingSpinner';
import ErrorDisplay from '../../components/forecasting/common/ErrorDisplay';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, Search, ChevronDown, Filter, ArrowUpDown, ArrowRight } from 'lucide-react';
import { fetchApi, checkCompanyDataStatus } from '../../utils/forecasting/apiConfig';
import EmptyStateDisplay from '../../components/forecasting/common/EmptyStateDisplay';
import { chartConfigs } from '../../utils/forecasting/chartHelpers';

const ProductsPage = () => {
  const router = useRouter();
  const { company } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [hasData, setHasData] = useState(true); // Default to true until we check

  // useEffect for fetching data
  useEffect(() => {
    if (!company) return;

    if (!['forge', 'cpl'].includes(company)) {
      router.replace('/dashboard/forge');
      return;
    }

    // Check if data exists for this company
    const checkDataStatus = async () => {
      try {
        const exists = await checkCompanyDataStatus(company);
        setHasData(exists);
        if (!exists) {
          // If no data exists, stop loading and return early
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error checking data status:", err);
        // Continue as if data exists in case of error
      }
      
      // Only fetch data if company has data
      fetchProductsData();
    };

    const fetchProductsData = async () => {
      try {
        setLoading(true);
        
        // Fetch categories first
        const categoriesData = await fetchApi(`/api/v1/sales/categories/${company}`);
        setCategories(categoriesData);
        
        // Fetch products with proper category filtering
        const productsUrl = selectedCategory 
          ? `/api/v1/sales/products/${company}?category=${encodeURIComponent(selectedCategory)}`
          : `/api/v1/sales/products/${company}`;
          
        const productsData = await fetchApi(productsUrl);
        setProducts(productsData);
        
        // Fetch top products
        const topProductsData = await fetchApi(`/api/v1/sales/top-products/${company}?limit=10`);
        setTopProducts(topProductsData);
        
      } catch (err) {
        console.error("Error fetching products data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkDataStatus();
  }, [company, selectedCategory, router]);

  // Only apply search filter client-side
  const filteredProducts = products.filter(product => {
    // Apply search query filter
    if (searchQuery && !product.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  
  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'name') {
      return sortOrder === 'asc' 
        ? a.localeCompare(b) 
        : b.localeCompare(a);
    }
    return 0;
  });

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle category filter change
  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };
  
  // Handle sort change
  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort column and default to ascending
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  // Prepare chart data
  const prepareChartData = () => {
    return topProducts.slice(0, 5).map(product => ({
      name: product.product.length > 20 
        ? product.product.substring(0, 20) + '...' 
        : product.product,
      quantity: product.total_quantity,
      revenue: product.total_revenue
    }));
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingSpinner message="Loading products..." />
      </AppLayout>
    );
  }
  
  if (error) {
    return (
      <AppLayout>
        <ErrorDisplay 
          title="Error Loading Products" 
          message={error}
          actionText="Go to Dashboard"
          actionHref={`/dashboard/${company}`}
        />
      </AppLayout>
    );
  }

  if (!hasData) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-medium text-gray-900">No Data Available</h2>
            <p className="mt-2 text-gray-500">There is currently no data for {company}. Upload data to view products.</p>
            <div className="mt-6 space-x-4">
              <Link href={`/upload/${company}`} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                Upload Data
              </Link>
              <Link href={`/dashboard/${company}`} className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50">
                Return to Dashboard
              </Link>
            </div>
            </div> */}

          <EmptyStateDisplay
            title="No Data Available"
            message={`There is currently no data for ${company}. Upload data to view products.`}
            type="noData"
            company={company}
            showUploadLink={true}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 capitalize">{company} Products</h1>
          <p className="mt-2 text-sm text-gray-600">
            
          </p>
        </div>
        
        {/* Top Products Chart */}
        <div className="bg-gray-50 p-6 rounded-lg shadow mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Products by Quantity</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prepareChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity" fill={chartConfigs.colors.category1} name="Quantity Sold" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Products List */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">All Products</h2>
            <div className="mt-4 md:mt-0">
              <p className="text-sm text-gray-600">
                Showing {sortedProducts.length} of {products.length} products
              </p>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-4 mb-6">
            {/* Search */}
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Products
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="search"
                  placeholder="Search Product Name..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            
            {/* Category Filter */}
            <div className="w-full md:w-48">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <div className="relative">
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm "
                >
                  <option value="">All Categories</option>
                  {categories.map((category, index) => (
                    <option key={index} value={category}>{category}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
            
            {/* Clear Filters Button */}
            <div>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
          
          {/* Products Table */}
          {sortedProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSortChange('name')}
                    >
                      <div className="flex items-center">
                        Product Name
                        {sortBy === 'name' && (
                          <ArrowUpDown className={`ml-1 h-4 w-4 ${
                            sortOrder === 'asc' ? 'transform rotate-180' : ''
                          }`} />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedProducts.map((product, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {product}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        <Link href={`/forecasts/product/${company}/${encodeURIComponent(product)}`} className="text-primary-600 hover:text-primary-900 inline-flex items-center">
                          View Forecast
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Products Found</h3>
              <p className="mt-2 text-gray-500">
                No products match your current filters. Try adjusting your search criteria.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ProductsPage;