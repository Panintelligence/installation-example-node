'use strict';
const { docopt } = require('docopt');
const Installer = require('./installation/installer');
const DashboardAPI = require('./dashboard/api');

const doc = `Usage:
    main.js install [options] <installer-path> <install-to-path>
    main.js install-api [options] [--exportFile=<xmlfile>]... <installer-path> <install-to-path> <url>
    main.js uninstall <install-to-path>
    main.js api [options] [--exportFile=<xmlfile>] <url>

    Options:
        -h --help            This help
        --group=group        Installation group [default: panintelligence]
        --exportFile=xmlfile Path to the export files
        --log=logfile        Location for the installion log [default: ./install.log]
        --username=username  Location for the installion log [default: admin]
        --password=password  Location for the installion log [default: dashboard]`


const wait = async (seconds) => {
    //see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await
    return await new Promise(done => setTimeout(() => done(), seconds * 1000));
}

const doApiCalls = async (options) => {
    const api = new DashboardAPI(options['<url>']);
    console.log("Waiting for tomcat (and authenticating)...")
    await api.authenticate(options['--username'], options['--password']);
    while (!api.gotTokenResponse()) {
        await wait(5);
        console.log("Still waiting...")
        await api.authenticate(options['--username'], options['--password']);
    }
    if (options['--exportFile'] && options['--exportFile'].length > 0) {
        console.log("Loading exports...")
        options['--exportFile'].forEach(async (filePath) => {
            const xmlContent = fs.readFileSync(filePath);
            await api.loadXmlExport(xmlContent);
        });
    }

    // Make some categories
    const categories = ["Example Category One", "Example Category Two"];
    for (let i = 0; i < categories.length; i++) {
        await api.createCategory(categories[i]);
    }

    const roles = ["Development", "Finance"];
    for (let i = 0; i < roles.length; i++) {
        await api.createRole(roles[i]);
    }

    // Now start making some users
    const usersInformation = [
        {
            "user": {
                "Username": "tim",
                "Password": "totally-safe-password",
                "Forenames": "Tim",
                "Surname": "Smith"
            },
            "variables": {
                "Department": "Development"
            }
        },
        {
            "user": {
                "Username": "jane",
                "Password": "totally-safe-password",
                "Forenames": "Jane",
                "Surname": "Walker"
            },
            "variables": {
                "Department": "Development"
            }
        },
        {
            "user": {
                "Username": "john",
                "Password": "totally-safe-password",
                "Forenames": "John",
                "Surname": "Anderson"
            },
            "variables": {
                "Department": "Finance"
            }
        },
    ];
    console.log("Loading users...")
    for (let i = 0; i < usersInformation.length; i++) {
        try {
            const userId = await api.createUser(usersInformation[i].user, categories, [usersInformation[i].variables["Department"]]);
            Object.keys(usersInformation[i].variables).forEach(async (key) => {
                await api.createVariable(key, usersInformation[i].variables[key], userId);
            });
        } catch(e) {
            console.error(e);
        }
    }
}


const options = docopt(doc);
const installer = new Installer(options['<installer-path>'], options['--group']);
if (options['install']) {
    installer.do(options['<install-to-path>'], '/verysilent', options['--log'])
        .then(() => {
            doApiCalls(options);
        });
} else if (options['uninstall']) {
    installer.undo(options['<install-to-path>']);
} else if (options['api']) {
    doApiCalls(options);
}
