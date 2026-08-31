/*
 * SPDX-License-Identifier: EUPL-1.2 OR LicenseRef-commercial
 *
 * Copyright (c) 2012-2026 mgm technology partners GmbH
 *
 * Dual License
 * ------------
 * This source file is part of the mgm A12 Platform and available under
 * a choice of two different licenses:
 *
 * 1. Open-Source License - EUPL v1.2
 *    You may redistribute and/or modify this file under the terms of the
 *    European Union Public License, version 1.2 - see https://eupl.eu/.
 *
 * 2. Commercial License
 *    Alternatively, you may obtain a commercial license from
 *    mgm technology partners GmbH, that permits use of this software
 *    under different terms (including support and maintenance services).
 *
 *    Please contact a12-license@mgm-tp.com for more information.
 *
 * You must select and comply with exactly one of the above license options.
 *
 * Warranty Disclaimer (applies to either option)
 * ----------------------------------------------
 * THIS SOFTWARE IS PROVIDED "AS IS" AND WITHOUT WARRANTY OF ANY KIND,
 * WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NON-INFRINGEMENT, EXCEPT WHERE SUCH DISCLAIMERS ARE HELD TO BE
 * LEGALLY INVALID. SEE THE RESPECTIVE LICENSE TEXT FOR DETAILS.
 */

import { useEffect } from "react";

import { UaaClient } from "@com.mgmtp.a12.uaa/uaa-authentication-client";
import { LoggerFactory } from "@com.mgmtp.a12.utils/utils-logging";

import { isRedirectFromKeyCloak } from "./integration";

const logger = LoggerFactory.getLogger("PT/use-oidc-login");

export function useOidcLogin(): void {
    useEffect(() => {
        const oidcClient = UaaClient.getOidcClient();

        const handleLoginCallback = async () => {
            try {
                logger.info("UAA process for callback.");
                oidcClient.initConnector();
                await oidcClient.processLoginCallback();
            } catch (error) {
                logger.warn("Failed to process the Keycloak login callback, restarting the login.", error);
                oidcClient.login();
            } finally {
                const { origin, pathname } = new URL(globalThis.location.href);
                globalThis.history.pushState("", "", origin + pathname);
            }
        };

        const oidcLogin = async () => {
            try {
                if (isRedirectFromKeyCloak()) {
                    await handleLoginCallback();
                } else {
                    logger.info("Start trigger UAA process for login.");
                    oidcClient.login();
                }
            } catch (error) {
                logger.error("Unexpected error while initiating the oidc login.", error);
            }
        };

        oidcLogin();
    }, []);
}
