import crypto from 'crypto';
import Configstore from 'configstore';
import {name} from '../../package';

const defaults = {
    app: {
        port: 3000,
        title: 'Astro',
        torrentsPerPage: 100,
        defaultSearchSorting: 'seeders',
        defaultSearchOrder: 'desc'
    },
    database: {
        mongodb: {
            enabled: true,
            host: '127.0.0.1',
            port: 27017,
            collection: 'astro'
        }
    },
    torrents: {
        whitelist: {
            enabled: false,
            categories: []
        },
        blacklist: {
            enabled: false,
            categories: []
        }
    },
    session: {
        secret: crypto.randomBytes(64).toString('hex')
    },
    trackers: [],
    providers: {
        tpb: {
            enabled: false
        },
        rss: {
            enabled: true,
            feeds: [{
                name: 'yts',
                url: 'https://yts.ag/rss',
                category: 'Movies',
                duration: '@hourly'
            }]
        }
    },
    api: {
        keyNeeded: false,
        key: crypto.randomBytes(32).toString('hex')
    },
    logs: {
        provider: 'default',
        location: 'logs/error.log'
    }
};

const config = new Configstore(name, {
    ...defaults
});

export default config;
