import React from 'react';
import { Database, Upload, AlertCircle } from 'lucide-react';
import Link from 'next/link';

/**
 * Data status indicator component to display current data status
 * 
 * @param {Object} props
 * @param {boolean} props.hasData - Whether the company has data
 * @param {string} props.company - Company identifier
 * @param {boolean} props.showUploadLink - Whether to show upload link
 */
const DataStatusIndicator = ({ 
  hasData, 
  company, 
  showUploadLink = true 
}) => {
  return (
    <div className={`flex items-center px-4 py-3 rounded-md ${
      hasData 
        ? 'bg-green-50 text-green-500 border border-green-200' 
        : 'bg-amber-50 text-amber-500 border border-amber-200'
    }`}>
      <div className={`p-2 rounded-full ${
        hasData ? 'bg-green-100' : 'bg-amber-100'
      }`}>
        {hasData ? (
          <Database className="h-5 w-5" />
        ) : (
          <AlertCircle className="h-5 w-5" />
        )}
      </div>
      <div className="ml-3 flex-1">
        <p className="text-sm font-medium">
          {hasData
            ? 'Data available'
            : 'No data available'}
        </p>
        <p className="text-xs mt-1">
          {hasData
            ? `${company} data is loaded and forecasts are available.`
            : `No data found for ${company}. Upload data to see forecasts.`}
        </p>
      </div>
      
      {!hasData && showUploadLink && (
        <Link 
          href={`/upload/${company}`}
          className="ml-4 whitespace-nowrap inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 hover:bg-opacity-5 hover:bg-white"
        >
          <Upload className="h-3 w-3 mr-1" />
          Upload Data
        </Link>
      )}
    </div>
  );
};

export default DataStatusIndicator;