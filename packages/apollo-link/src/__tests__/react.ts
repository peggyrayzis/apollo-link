import Observable from 'zen-observable-ts';
import gql from 'graphql-tag';

import { execute, ApolloLink, from, split, concat } from '../link';
import { MockLink, SetContextLink, testLinkResults } from '../test-utils';
import { FetchResult, Operation, NextLink } from '../types';

describe('basic links', () => {
  describe('stateless', () => {
    it('can do things with information', done => {
      const query = gql`
        query Hello {
          id
        }
      `;

      const sentry = {
        send: jest.fn(() => {}),
      };

      // pure fuction
      const sentryLink = new ApolloLink((operation, forward) => {
        return forward(operation).map(({ data, errors }) => {
          if (errors) sentry.send({ errors, name: operation.operationName });
        });
      });

      const http = uri =>
        new ApolloLink(operation => {
          return new Observable(observer => {
            setTimeout(() => {
              observer.next({ data: null, errors: [{ path: 'id' }] });
              observer.complete();
            });
          });
        });

      const link = sentryLink.concat(http('/graphql'));

      execute(link, { query }).subscribe(console.log, console.warn, done);

      // what I want to do, where it goes
      // ReactDom.render(Component, element)

      // what I want to do, what data is required
      // execute(ApolloLink, Operation)
    });
  });
  describe('stateful', () => {
    it('manages state', done => {
      class BusyLink extends ApolloLink {
        count: number = 0;

        request(operation, forward) {
          this.count++;
          const sbservable = forward(operation);
          sbservable.subscribe({
            complete: () => {
              console.log(this.count);
            },
          });

          return sbservable;
        }
      }

      const query = gql`
        query Hello {
          id
        }
      `;

      const http = uri =>
        new ApolloLink(operation => {
          return new Observable(observer => {
            setTimeout(() => {
              observer.next({ data: null, errors: [{ path: 'id' }] });
              observer.complete();
            });
          });
        });

      const link = ApolloLink.from([new BusyLink(), http('/')]);

      execute(link, { query }).subscribe(console.log, console.warn, () => {
        execute(link, { query }).subscribe(console.log, console.warn, done);
      });
    });
  });
});
