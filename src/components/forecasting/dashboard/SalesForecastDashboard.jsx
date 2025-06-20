import React, { useState, useEffect } from 'react';
import { Line, Bar, ResponsiveContainer, LineChart, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush } from 'recharts';
import { CalendarDays, TrendingUp, Package, Store, Layers, AlertTriangle, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { fetchApi, checkCompanyDataStatus } from '../../../utils/forecasting/apiConfig';
import Link from 'next/link';
import { useRouter } from 'next/router';
import EmptyStateDisplay from '../../forecasting/common/EmptyStateDisplay';
import DataManagementPanel from '../../forecasting/common/DataManagementPanel';
import { formatDate, formatCurrency, formatInteger } from '../../../utils/forecasting/formatters';
import { chartConfigs } from '../../../utils/forecasting/chartHelpers';

// Main Dashboard Component
const SalesForecastDashboard = ({ selectedCompany }) => {
  const router = useRouter();
  const [forecastData, setForecastData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasData, setHasData] = useState(true); // Default to true until we check

  useEffect(() => {
    const checkDataStatus = async () => {
      try {
        const hasCompanyData = await checkCompanyDataStatus(selectedCompany);
        setHasData(hasCompanyData);
        if (!hasCompanyData) {
          // Clear loading state if there's no data
          setLoading(false);
        }
      } catch (err) {
        console.error("Error checking data status:", err);
        // Don't set error, just assume data exists in case of error
      }
    };
    
    checkDataStatus();
  }, [selectedCompany]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!hasData) {
        setLoading(false);
        return; // Don't try to fetch data if there is none
      }
      
      setLoading(true);
      try {
        // Fetch revenue forecast
        const forecastResult = await fetchApi(`/api/v1/forecasts/revenue/${selectedCompany}`);
        
        // Fetch top products
        const productsResult = await fetchApi(`/api/v1/sales/top-products/${selectedCompany}`);
        
        // Fetch categories
        const categoriesResult = await fetchApi(`/api/v1/sales/categories/${selectedCompany}`);
        
        setForecastData(forecastResult);
        setTopProducts(productsResult);
        setCategories(categoriesResult);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [selectedCompany, hasData]);

  // Prepare chart data
  const prepareChartData = () => {
    if (!forecastData || !forecastData.dates) return [];
    
    return forecastData.dates.map((date, index) => ({
      date,
      actual: forecastData.actuals[index] || null,
      predicted: forecastData.predictions[index],
      lowerBound: forecastData.lower_bound[index],
      upperBound: forecastData.upper_bound[index]
    }));
  };
  
  const chartData = prepareChartData();
  
  // Calculate metrics
  const getMetrics = () => {
    if (!forecastData) return { revenue: 0, accuracy: 0, trend: 0 };
    
    const lastActualIndex = forecastData.actuals.findLastIndex(val => val !== null);
    const predictedRevenue = forecastData.predictions
      .slice(lastActualIndex + 1)
      .reduce((sum, val) => sum + val, 0);
    
    const mape = forecastData.metrics?.mape || 0;
    const accuracy = 100 - mape;
    
    // Calculate trend (comparing last month to previous)
    const recentPredictions = forecastData.predictions.slice(-14);
    const firstWeek = recentPredictions.slice(0, 7).reduce((sum, val) => sum + val, 0);
    const secondWeek = recentPredictions.slice(-7).reduce((sum, val) => sum + val, 0);
    const trend = ((secondWeek - firstWeek) / firstWeek) * 100;
    
    return {
      revenue: predictedRevenue.toFixed(2),
      accuracy: accuracy.toFixed(1),
      trend: trend.toFixed(1)
    };
  };
  
  const metrics = getMetrics();

  // Add a handler for the DataManagementPanel:
  const handleDataChange = (newHasData) => {
    setHasData(newHasData);
    // Clear data if it was deleted
    if (!newHasData) {
      setForecastData(null);
      setTopProducts([]);
      setCategories([]);
    }
  };

  const handleNavigateToUpload = () => {
    router.push(`/upload/${selectedCompany}`);
  };

  // Custom legend renderer to apply text color
  const renderColorfulLegendText = (value, entry) => {
    return <span style={{ color: 'var(--text-secondary)' }}>{value}</span>;
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      <span className="ml-2">Loading dashboard...</span>
    </div>
  );

  if (error) return (
    <div className="flex h-screen items-center justify-center">
      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <h3 className="text-red-800 font-medium flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Error Loading Dashboard
        </h3>
        <p className="text-red-700 mt-2">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 bg-red-100 text-red-800 px-4 py-2 rounded hover:bg-opacity-5 hover:bg-white"
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800 capitalize">{selectedCompany} Sales Forecast</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!hasData ? (
          <EmptyStateDisplay
            title="No Data Available"
            message={`There is currently no data for ${selectedCompany}. Upload data to generate forecasts.`}
            type="noData"
            company={selectedCompany}
            showDashboardLink={false}
          />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-primary-100 text-primary-600">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Forecasted Revenue</p>
                    <h3 className="text-xl font-bold text-gray-900">£{metrics.revenue}</h3>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-amber-50 text-amber-600">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Forecast Accuracy</p>
                    <h3 className="text-xl font-bold text-gray-900">{metrics.accuracy}%</h3>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-primary-100 text-primary-600">
                    {parseFloat(metrics.trend) >= 0 ? 
                      <ArrowUpRight className="w-6 h-6" /> : 
                      <ArrowDownRight className="w-6 h-6" />
                    }
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Revenue Trend</p>
                    <h3 className={`text-xl font-bold ${
                      parseFloat(metrics.trend) >= 0 ? 'text-green-300' : 'text-red-300'
                    }`}>
                      {parseFloat(metrics.trend) >= 0 ? '+' : ''}{metrics.trend}%
                    </h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Forecast Chart */}
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Forecast</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth()+1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'Actual' || name === 'Forecast') {
                          return [formatInteger(value), name];
                        }
                        return [formatInteger(value), name];
                      }}
                      labelFormatter={(label) => formatDate(new Date(label), { format: 'long' })}
                    />
                    <Legend formatter={renderColorfulLegendText} />
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      stroke={chartConfigs.colors.actual} 
                      strokeWidth={2} 
                      dot={(props) => {
                        if (props && props.payload && props.payload.actual !== null) {
                          const { dataKey, key, ...restProps } = props;
                          return <circle key={key} {...restProps} r={3} />;
                        } else {
                          return null; // Hide dot completely for null points
                        }
                      }}
                      activeDot={(props) => {
                        const { dataKey, key, ...restProps } = props;
                        return <circle key={key} {...restProps} r={6} />;
                      }}
                      name="Actual Revenue"
                      isAnimationActive={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="predicted" 
                      stroke={chartConfigs.colors.predicted} 
                      strokeWidth={2}
                      name="Forecast" 
                      strokeDasharray="5 5"
                      dot={(props) => {
                        // Only show dots for predicted values in the forecast period
                        if (props && props.payload && props.payload.isForecasted) {
                          const { key, dataKey, ...restProps } = props;
                          return <circle key={key} {...restProps} r={3} />;
                        } else {
                          return null;
                        }
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="upperBound" 
                      stroke={chartConfigs.colors.upperBound} 
                      strokeWidth={1}
                      name="Upper Bound"
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="lowerBound" 
                      stroke={chartConfigs.colors.lowerBound} 
                      strokeWidth={1}
                      name="Lower Bound"
                      dot={false}
                    />
                    <Brush dataKey="date" height={10} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Data Management Panel - Moved here from the top */}
            <div className="mb-8">
              <DataManagementPanel
                company={selectedCompany}
                hasData={hasData}
                onDataChange={handleDataChange}
                onNavigateToUpload={handleNavigateToUpload}
              />
            </div>
            
            {/* Top Products & Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Top Products */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="product" 
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 12)}...` : value}
                      />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}`, null]} />
                      <Legend formatter={renderColorfulLegendText} />
                      <Bar dataKey="total_quantity" fill={chartConfigs.colors.category1} name="Quantity"  />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4">
                  <Link href={`/products/${selectedCompany}`} className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                    View all products →
                  </Link>
                </div>
              </div>
              
              {/* Categories */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
                {categories.length > 0 ? (
                  <div className="space-y-3">
                    {categories.slice(0, 6).map((category, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-gray-700">{category}</span>
                        <a href={`/forecasts/category/${selectedCompany}/${category}`} className="text-primary-600 hover:text-primary-800 text-sm">
                          View Forecast
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No categories available</p>
                )}
                <div className="mt-4">
                  <Link href={`/categories/${selectedCompany}`} className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                    View all categories →
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default SalesForecastDashboard;