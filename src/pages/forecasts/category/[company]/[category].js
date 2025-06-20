import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '../../../../components/forecasting/layout/AppLayout';
import LoadingSpinner from '../../../../components/forecasting/common/LoadingSpinner';
import ErrorDisplay from '../../../../components/forecasting/common/ErrorDisplay';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import { ArrowLeft, RefreshCw, Calendar, TrendingUp, Package } from 'lucide-react';
import { formatDate, formatInteger } from '../../../../utils/forecasting/formatters';
import { fetchApi } from '../../../../utils/forecasting/apiConfig';
import { chartConfigs } from '../../../../utils/forecasting/chartHelpers';

const CategoryForecastPage = () => {
  const router = useRouter();
  const { company, category } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [products, setProducts] = useState([]);
  const [generating, setGenerating] = useState(false);

  // Custom legend renderer to apply text color
  const renderColorfulLegendText = (value, entry) => {
    return <span style={{ color: 'var(--text-secondary)' }}>{value}</span>;
  };

  useEffect(() => {
    if (!company || !category) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch category forecast
        const decodedCategory = decodeURIComponent(category);
        const forecastData = await fetchApi(`/api/v1/forecasts/category/${company}/${decodedCategory}`);
        setForecast(forecastData);
        
        // Fetch products in this category
        const productsData = await fetchApi(`/api/v1/sales/products/${company}?category=${decodedCategory}`);
        setProducts(productsData);
      } catch (err) {
        console.error("Error fetching category data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [company, category]);

  const handleRegenerate = async () => {
    if (!company || !category) return;

    try {
      setGenerating(true);
      
      // Force retrain the model
      const decodedCategory = decodeURIComponent(category);
      const data = await fetchApi(
        `/api/v1/forecasts/category/${company}/${decodedCategory}?force_retrain=true`
      );
      setForecast(data);
    } catch (err) {
      console.error("Error regenerating forecast:", err);
      // Show a toast or alert instead of setting global error
    } finally {
      setGenerating(false);
    }
  };

  const prepareChartData = () => {
    if (!forecast || !forecast.dates) return [];
    
    return forecast.dates.map((date, index) => ({
      date,
      actual: forecast.actuals[index] || null,
      predicted: forecast.predictions[index],
      lowerBound: forecast.lower_bound[index],
      upperBound: forecast.upper_bound[index]
    }));
  };
  
  const chartData = prepareChartData();
  
  // Calculate historical vs forecast boundary index
  const historicalEndIndex = forecast?.actuals.findLastIndex(val => val !== null) || 0;
  
  // Calculate metrics
  const getMetrics = () => {
    if (!forecast) return { 
      mape: 0, 
      forecastTotal: 0, 
      forecastAvg: 0,
      forecastPeriod: { start: '', end: '' } 
    };
    
    const mape = forecast.metrics?.mape || 0;
    
    // Sum forecasted quantities
    const forecastedData = forecast.predictions.slice(historicalEndIndex + 1);
    const forecastTotal = forecastedData.reduce((sum, val) => sum + val, 0);
    const forecastAvg = forecastTotal / forecastedData.length;
    
    // Get start and end dates of forecast period
    const forecastStartDate = new Date(forecast.dates[historicalEndIndex + 1]);
    const forecastEndDate = new Date(forecast.dates[forecast.dates.length - 1]);
    
    return {
      mape,
      forecastTotal: formatInteger(forecastTotal),
      forecastAvg: formatInteger(forecastAvg),
      forecastPeriod: {
        start: forecastStartDate.toLocaleDateString(),
        end: forecastEndDate.toLocaleDateString()
      }
    };
  };
  
  const metrics = getMetrics();

  if (loading) {
    return (
      <AppLayout>
        <LoadingSpinner message="Loading category forecast..." />
      </AppLayout>
    );
  }
  
  if (error) {
    return (
      <AppLayout>
        <ErrorDisplay 
          title="Error Loading Category Forecast" 
          message={error}
          actionText="Go to Categories"
          actionHref={`/categories/${company}`}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <Link href={`/categories/${company}`} className="flex items-center text-gray-500 hover:text-gray-700 mb-2">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Categories
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 capitalize">
                {decodeURIComponent(category)} Forecast
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Sales forecast for {decodeURIComponent(category)} category in {company}
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <button
                onClick={handleRegenerate}
                disabled={generating}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-primary-300"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate Forecast
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary-100 text-primary-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Forecasted Units</p>
                <h3 className="text-xl font-bold text-gray-900">{metrics.forecastTotal}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Avg: {metrics.forecastAvg} per day
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-amber-50 text-amber-600">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Forecast Period</p>
                <h3 className="text-lg font-bold text-gray-900">
                  {`${metrics.forecastPeriod.start} - ${metrics.forecastPeriod.end}`}
                </h3>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary-100 text-primary-600">
                <Package className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Products in Category</p>
                <h3 className="text-xl font-bold text-gray-900">{products.length}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Main Forecast Chart */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Sales Forecast</h2>
          <div className="h-96">
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
                  formatter={(value, name) => [value !== null ? formatInteger(value) : '-', null]}
                  labelFormatter={(label) => formatDate(new Date(label), { format: 'long' })}
                />
                <Legend formatter={renderColorfulLegendText} />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke={chartConfigs.colors.actual} 
                  strokeWidth={2} 
                  dot={(props) => {
                    const { dataKey, key, ...restProps } = props;
                    return <circle key={key} {...restProps} r={3} />;
                  }}
                  activeDot={(props) => {
                    const { dataKey, key, ...restProps } = props;
                    return <circle key={key} {...restProps} r={6} />;
                  }}
                  name="Actual"
                />
                <Line 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke={chartConfigs.colors.predicted} 
                  strokeWidth={2}
                  name="Forecast" 
                  strokeDasharray={function(entry) {
                    // Use solid line for historical fitted values and dashed for future forecast
                    const index = chartData.indexOf(entry);
                    return index <= historicalEndIndex ? "0" : "5 5";
                  }}
                  dot={(props) => {
                    // Check if we're in the historical or forecast period
                    const index = chartData.indexOf(props.payload);
                    if (index <= historicalEndIndex) {
                      return null; // Don't render dots for historical fitted values
                    } else {
                      // Render dots only for forecast period
                      const { dataKey, key, ...restProps } = props;
                      return <circle key={key} {...restProps} r={3} fill={chartConfigs.colors.predicted} />;
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
        
        {/* Components Chart, comment it out for now */}
        {/*
        {forecast && forecast.components && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Forecast Components</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
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
                    formatter={(value) => [value !== null ? formatInteger(value) : '-', null]}
                    labelFormatter={(label) => formatDate(new Date(label), { format: 'long' })}
                  />
                  <Legend />
                  {forecast.components.trend && (
                    <Area 
                      type="monotone" 
                      dataKey={() => forecast.components.trend.map((v, i) => v)}
                      data={chartData}
                      fill="#8884d8" 
                      stroke="#8884d8"
                      name="Trend"
                      fillOpacity={0.3}
                    />
                  )}
                  {forecast.components.weekly && (
                    <Area 
                      type="monotone" 
                      dataKey={() => forecast.components.weekly.map((v, i) => v)}
                      data={chartData}
                      fill="#82ca9d" 
                      stroke="#82ca9d"
                      name="Weekly Pattern"
                      fillOpacity={0.3}
                    />
                  )}
                  {forecast.components.yearly && (
                    <Area 
                      type="monotone" 
                      dataKey={() => forecast.components.yearly.map((v, i) => v)}
                      data={chartData}
                      fill="#ffc658" 
                      stroke="#ffc658"
                      name="Yearly Pattern"
                      fillOpacity={0.3}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>
                The forecast components show the underlying patterns in the data:
              </p>
              <ul className="list-disc pl-5 mt-2">
                <li>Trend shows the overall direction over time</li>
                <li>Weekly pattern shows day-of-week effects</li>
                <li>Yearly pattern shows seasonal effects throughout the year</li>
              </ul>
            </div>
          </div>
        )}
        */}
        
        {/* Products in Category */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Products in Category</h2>
          {products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {product}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Link href={`/forecasts/product/${company}/${encodeURIComponent(product)}`} className="text-primary-600 hover:text-primary-900">
                          View Forecast
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No products found in this category
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default CategoryForecastPage;