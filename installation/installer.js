

const childProcess = require('child_process');

'use strict';

class Installer {
    constructor(path, group) {
        this.path = path;
        this.group = group;
    }

    do(installPath, args, log) {
        // setup-pi.exe,
        //     args=/verysilent
        //     /log="setup-pi.log"
        //     /dir="C:\Dashboard"
        //     /group="Dashboard"
        return new Promise((resolve, reject) => {
            childProcess.exec(`${this.path} args=${args} /log=${log} /dir=${installPath} /group=${this.group}`, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                }
                resolve(stdout);
            });
        });
    }

    undo(installPath) {
        return new Promise((resolve, reject) => {
            childProcess.exec(`${installPath}/uninst000.exe`, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                }
                resolve(stdout);
            });
        });
    }
}


module.exports = Installer;