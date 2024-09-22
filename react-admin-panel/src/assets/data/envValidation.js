const envData = [
    {
        path: 'VITE_API_BASE_URL',
        regex: /^https?:\/\/[\w\-.~!*'();:@&=+$,/?%#\[\]]*(%[0-9a-fA-F]{2})*(:\d{2,5})?$/
    },
]

export default envData;