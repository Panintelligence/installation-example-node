const querystring = require('querystring');

const jsonToWWWEncoded = (params) => {
    if(!params){
        return '';
    }
    return querystring.encode(params);
}

const mergeDefault = (defaultParams, params) => {
    const merged = JSON.parse(JSON.stringify(defaultParams));
    Object.keys(params).forEach((k) => {
        merged[k] = params[k];
    });
    return merged;
}

module.exports = {
    jsonToWWWEncoded,
    mergeDefault
}