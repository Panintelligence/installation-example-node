'user strict'

const http = require('http');
const xml2js = require('xml2js');
const utilParams = require('../utils/params');


// The API Documentation can be found in your dashboard installation:
// http://dashboard.url.here/panMISDashboardWebServices/api/documentation/
class DashboardAPI {
    constructor(url) {
        this.url = url;
        this.xmlParser = new xml2js.Parser();
        this.token = null;
        this.tokenError = null;
    }

    async parseXml(xml) {
        return new Promise((resolve, reject) => {
            this.xmlParser.parseString(xml, (err, result) => {
                resolve(result);
            })
        });
    }

    gotTokenResponse() {
        return this.token !== null || this.tokenError !== null;
    }

    async call(method, endpoint, queryParams, bodyParams) {
        if (!this.token && endpoint !== "token") {
            throw new Error("No token!");
        }
        const queryString = utilParams.jsonToWWWEncoded(queryParams);
        const bodyWWWEncoded = utilParams.jsonToWWWEncoded(bodyParams);
        const headers = method.toLowerCase() !== "post" ? {} : {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': bodyWWWEncoded.length
        };
        const options = {
            method,
            path: `/panMISDashboardWebServices/api/${this.token || ''}/${endpoint}${queryString ? '?' : ''}${queryString}`,
            headers
        };
        return new Promise((resolve, reject) => {
            let responseStr = "";
            const req = http.request(this.url, options, (res) => {
                res.setEncoding('utf8');

                res.on('data', (chunk) => {
                    responseStr += chunk;
                });

                res.on('end', () => {
                    resolve(responseStr);
                });
            })
            req.write(bodyWWWEncoded);
            req.end();
        });
    }

    async authenticate(username, password) {
        console.log("Authenticating");
        try {
            const loginResult = await this.call('post', 'token', null, {
                username,
                password
            });
            const result = await this.parseXml(loginResult);
            this.token = result.UserDetails.Token[0];
            this.tokenError = null;
        } catch (e) {
            console.error(e);
            this.token = null;
            this.tokenError = true;
        }
        console.log(this.token, this.tokenError)
        return this.token;
    }

    // Creating a User
    async createUser(options, categories, roles) {
        if (!this.token) {
            await this.authenticate();
        }

        const allocatedRoles = (roles || []).map(role => {
            return `<Role><Name>${role}</Name></Role>`
        }).join(" ");

        const allocatedCategories = (categories || []).map(category => {
            return `<Category><Description>${category}</Description></Category>`
        }).join(" ");

        const defaultParams = {
            "AllowExternalLogin": true,
            "Username": null,
            "Forenames": null,
            "PersonTeam": "I",
            "ParentId": 0,
            "RoleDescription": "Chart Viewer",
            "Disabled": false,
            "ExcludePasswordExpiry": false,
            "EditOwnPassword": false,
            "EditSql": false,
            "EditDataConnections": true,
            "EditReports": false,
            "EditCategories": false,
            "Audit": true,
            "SuppressWarnings": true,
            "UserRoles": `<UserRoles>${allocatedRoles}</UserRoles>`,
            "AllocatedCategories": `<AllocatedCategories updateMethod='append'>${allocatedCategories}</AllocatedCategories>`,
            "DisplayChartInfo": true,
            "DisplayDisabledButtons": false,
            "SelectOwnTheme": true,
            "IsLite": false,
            "LogoutEnabled": false,
            "AccessAccount": false,
        };
        const userInfo = await this.call('post', 'user', null, utilParams.mergeDefault(defaultParams, options));
        return await this.parseXml(userInfo).User;
    }

    // Removing a User
    async removeUser(username) {
        const users = await this.call('get', 'user');
        const user = users.Users.User.find((user) => {
            return user["_"] == username;
        });
        const userSplitUrl = user['$'].href.split('/');
        await this.call('delete', `user/${userSplitUrl[userSplitUrl.length - 1]}`);
    }

    // Creating a Category
    async createCategory(name, parent) {
        const categoryInfo = await this.call('post', 'category', null, {
            "Name": name,
            "Parent": parent || 1
        });
        return await this.parseXml(categoryInfo).Category;
    }

    // Creating a Role
    async createRole(name) {
        const roleInfo = await this.call('post', 'role', null, {
            "Name": name
        });
        return await this.parseXml(roleInfo).Role;
    }

    // Create Variables for a user
    async createVariable(name, value, userId) {
        const params = {
            "Name": name,
            "Value": value,
            "IsSystem": false
        }
        if (userId) {
            params["UserId"] = userId;
        }
        await this.call('post', 'variable', null, params);
    }



    // Export an existing data connection - This is something that you'd probably have done beforehand.
    async exportDataconnection(id) {
        return await this.call('get', `dataconnection/${id}`, { apiRequestType: "export" })
    }

    // Load an existing Xml export (content)
    async loadXmlExport(xmlContent) {
        // data connection exports are identified by the data connection's Name property inside the export file
        return await this.call('post', 'dataconnection', null, {
            "ImportXml": xmlContent
        });
    }
}


module.exports = DashboardAPI;