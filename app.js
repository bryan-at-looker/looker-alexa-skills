'use strict';

console.log('Made It')

const Alexa = require('ask-sdk-core');
const https = require('request');

const LOOKER_CLIENT_ID = process.env.looker_client_id;
const LOOKER_CLIENT_SECRET = process.env.looker_client_secret;
const LOOKER_API_URL = process.env.looker_api_url;
const intent_look_map = JSON.parse(process.env.intent_look_map);
const SKILL_NAME = 'Active Users';
// const MEETUP_URL = `https://api.meetup.com/desiconnections/events?key=${MEETUP_API_KEY}&sign=true`;

// Handlers
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speechText = `Welcome to ${SKILL_NAME}. You can get all meetup events by saying my events`;
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard(SKILL_NAME, speechText)
            .getResponse();
    }
};

const SkillHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name in intent_look_map;
    },
    // handle(handlerInput) {
    async handle(handlerInput) {
        let speechText = '';
        let look_id = intent_look_map[handlerInput.requestEnvelope.request.intent.name]['look_id'];
        let force_limit = intent_look_map[handlerInput.requestEnvelope.request.intent.name]['force_limit'];
        console.log(look_id)
        console.log('Made It to Active Users')
        var options = { json: true };
        
        try {
            // speechText = "You have no active users, you loser"
            speechText = await runLook(look_id, options, force_limit);
            // console.log(`Meetup Events: ${speechText}`);            
        } catch (error) {
            speechText = error.message;
            console.log(`Intent: ${handlerInput.requestEnvelope.request.intent.name}: message: ${error.message}`);
        }
        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard(SKILL_NAME, speechText)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;            
        console.log(`Request Type: ${request.type}`);
        console.log(`Intent: ${request.intent.name}`);    
        return request.type === 'IntentRequest'
            && request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speechText = 'You can get all meetup events by saying my events';
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard(SKILL_NAME, speechText)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;    
        console.log(`Request Type: ${request.type}`);
        console.log(`Intent: ${request.intent.name}`);
        return request.type === 'IntentRequest'
            && (request.intent.name === 'AMAZON.CancelIntent'
            || request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speechText = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard(SKILL_NAME, speechText)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;    
        console.log(`Request Type: ${request.type}`);
        console.log(`Intent: ${request.intent.name}`);
        return request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        //any cleanup logic goes here
        return handlerInput.responseBuilder.getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
      return true;
    },
    handle(handlerInput, error) {
      console.log(`Error handled: ${error.message}`);
      return handlerInput.responseBuilder
        .speak('Sorry, I can\'t understand the command. Please say again.')
        .reprompt('Sorry, I can\'t understand the command. Please say again.')
        .getResponse();
    },
};

function login () {
    let url = LOOKER_API_URL+'/login';
    var options = { 
        json: true,
        method: 'POST',
        qs: { 
            client_id: LOOKER_CLIENT_ID,
            client_secret: LOOKER_CLIENT_SECRET
        }
    };

    console.log(url)
    return new Promise (function (resolve, reject) {
        https (url, options, (err, res, body) => {
            if (err) {
                console.log ("Error logging into Looker");
                reject (new Error ("Error logging into Looker"));
            }
            console.log (body);
            console.log (body['access_token']);
            console.log (body.access_token);
            resolve('token '+body['access_token'])
        })
    })
}

function logout (auth) {

    let options = {
        json: true,
        method: 'DELETE',
        headers: {
            'Authorization': auth
        }
    }
    return new Promise (function (resolve, reject) {
        https (LOOKER_API_URL+'/logout', options, (err, res, body) => {
            if (err) {
                console.log ("Error logging out");
                reject (new Error ("Error logging out"));
            }
            console.log('logout')
            resolve('')
            
        })
    })
}

function cleanup_alexa (alexaResponse) {
    let alexaResponseClean = alexaResponse.replace('&',' ')
    return alexaResponseClean
}

// helper methods
async function runLook (look_id, options, force_limit) {
    let auth = await login()
    let url = LOOKER_API_URL+'/looks/'+look_id+'/run/json';
    console.log(url)
    console.log(auth)
    options['method'] = 'GET'
    // options['qs'] = { 
    //     apply_vis: true,
    //     server_table_calcs: true,
    //     apply_formatting: true
    // };
    options['headers'] = {
        'Authorization': auth,
        'User-Agent': 'looker-alexa-skill'
    }



    return new Promise (function (resolve, reject) {
        // let meetupEvents = 'Here are the events in the group.';
        // const space = ' ';
        // const comma = ',';
        // const period = '.';

        let speechText = '';


        https (url, options, (err, res, body) => {
            if (err) { 
                console.log ("Error retrieving data from Looker");
                logout(auth);   
                reject (new Error ("Error retrieving data from Looker"));
            }
            console.log (body);

            if (force_limit) {
                body = body.slice(0,force_limit)
            }
            
            body.forEach( function (body) {
                speechText += body.alexa + '. '
            });
            console.log(cleanup_alexa(speechText));
            // logout(auth);
            resolve (cleanup_alexa(speechText));
        });
    });
} 

// export the handlers
exports.lookerHandler = Alexa.SkillBuilders.custom()
     .addRequestHandlers(LaunchRequestHandler,
                         SkillHandler,
                         HelpIntentHandler,
                         CancelAndStopIntentHandler,
                         SessionEndedRequestHandler)
    .addErrorHandlers(ErrorHandler)
    .lambda();