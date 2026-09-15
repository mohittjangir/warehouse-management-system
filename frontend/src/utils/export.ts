export function exportTableToCSV(data: any[], filename: string) {
  if (!data || !data.length) return;

  // Extract headers
  const headers = Object.keys(data[0]);

  // Convert objects to CSV lines
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((fieldName) => {
          let cellData = row[fieldName];
          // Handle null/undefined
          if (cellData === null || cellData === undefined) cellData = '';
          // Handle strings with commas or quotes
          if (typeof cellData === 'string') {
            cellData = cellData.replace(/"/g, '""'); // escape double quotes
            if (cellData.search(/("|,|\n)/g) >= 0) {
              cellData = `"${cellData}"`;
            }
          }
          return cellData;
        })
        .join(',')
    ),
  ].join('\n');

  // Create Blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
