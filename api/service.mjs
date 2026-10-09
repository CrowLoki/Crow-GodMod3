import {createSiteApi} from '../lib/site-api.mjs';
export default createSiteApi({secret:process.env.CROW_GODMOD3_SESSION_SECRET});
