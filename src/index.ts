/**
 * Copyright (C) 2026 Dustin Dew <phyxashun@gmail.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import App from './components/App';

export const Message = (msg: unknown): void => {
    if (msg instanceof Error) {
        console.error(`Fatal crash: ${msg.message}`);
    } else {
        console.error(`Fatal crash: ${msg}`);
    }
};

/**
 * MAIN ENTRY POINT
 */
// c8 ignore start
if (import.meta.main) {
    try {
        await App.run();
    } catch (err) {
        Message(err);
        process.exit(1);
    }
}
// c8 ignore stop
