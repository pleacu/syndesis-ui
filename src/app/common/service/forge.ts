import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';

import * as URI from 'urijs';
import * as _ from 'lodash';

import { AppState } from './../../app.service';
import { Logger } from './log';
import { AppHelpers } from './../helpers/app';

var log = Logger.get('Forge');

export interface CommandOptions {
  teamId?:string;
  projectId?:string;
  commandId?:string;
  [name:string]:any;
}

@Injectable()
export class Forge {

  private urlString:string = undefined;
  private url:uri.URI = undefined;

  constructor(private http: Http, private appState: AppState) {
    var urlString = this.urlString = appState.config.urls['FABRIC8_FORGE']
    this.url = new URI(urlString);
    log.debug("Forge service using URL: ", this.url.toString());
  }

  /*
   * Get the inputs for a given command ID
   * TODO add project/namespace parameters
   */
  getCommandInputs(options:CommandOptions):Observable<any> {
    if (!options.commandId) {
      throw "Command ID required";
    }
    return AppHelpers.maybeInvoke(this.urlString, () => {
      var url = this.url.clone().segment('commandInput').segment(options.commandId);
      if (options.teamId && options.projectId) {
        url = url.segment(options.teamId).segment(options.projectId);
      }
      log.debug("Using URL: ", url.toString());
      return this.http.get(url.toString())
                      .map((res:Response) => {
                        log.debug("Got response: ", res.json());
                        return res.json();
                      })
                      .catch((error) => {
                        log.error("Error fetching command inputs for command " + options.commandId + ": ", error)
                        return error;
                      });
    }, {});

  };

  /*
   * Get all the commands available without a project
   * TODO add project/namespace parameters
   */
  getCommands(options?:CommandOptions):Observable<any> {
    return AppHelpers.maybeInvoke(this.urlString, () => {
      var url = this.url.clone().segment('commands');
      if (options && options.teamId && options.projectId) {
        url = url.segment(options.teamId).segment(options.projectId);
      }
      log.debug("Using URL: ", url.toString());
      return this.http.get(url.toString())
                      .map((res:Response) => {
                        var body = <any[]> res.json();
                        var commandMap = {
                          names: [],
                          commands: {}
                        };
                        if (_.isArray(body)) {
                          log.debug("Received body: ", body);
                          // no point showing disabled commands
                          body = _.filter(body, (item:any) => item.enabled);
                          _.forEach(body, (item:any) => {
                            var category = <string>_.get(item, 'category') || 'Uncategorized';
                            var commands = <any[]>_.get(commandMap.commands, category);
                            if (!commands) {
                              commandMap.names.push(category);
                              commandMap.names.sort();
                              commands = [item];
                            } else {
                              commands.push(item);
                              commands = _.sortBy(commands, 'name');
                            }
                            commandMap.commands[category] = commands;
                          });
                        } else {
                          log.warn("Expected to receive array, but instead got: ", body);
                        }
                        return commandMap;
                      })
                      .catch((error) => {
                        log.error("Error fetching commands: ", error)
                        return error;
                      });
    }, []);
  }

}
