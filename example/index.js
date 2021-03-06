import React, { Component, Fragment, useEffect, useState } from 'react';
import { render } from 'react-dom';
import { APIClient, Openlaw } from 'openlaw';

// DO NOT COPY the lines below;
// if your app is bundled and using our `esm/ lib,
// in your app they will become:
//   import OpenLawForm from 'openlaw-elements';
//   import 'openlaw-elements/dist/esm/openlaw-elements.min.css';
import OpenLawForm from '../src';
import '../src/style.scss';

import Collapsible from './Collapsible';
import SampleTemplateText from './SAMPLE_TEMPLATE.txt';

/**
 * Example app showing how you can render `OpenLawForm`
 * with a valid OpenLaw template.
 */

const loginDetails = {
  email: process.env.OPENLAW_EMAIL || '',
  password: process.env.OPENLAW_PASSWORD || '',
};

// for running against your OpenLaw instance: 'https://[YOUR.INSTANCE.URL]';
const apiClient = new APIClient('https://app.openlaw.io');
apiClient
  .login(loginDetails.email, loginDetails.password) //eslint-disable-line  no-undef
  .catch((error) => {
    if (/500/.test(error)) {
      console.warn('OpenLaw APIClient: Please authenticate to the APIClient to use the Address input.');
      return;
    }
    console.error('OpenLaw APIClient:', error);
  });

/**
 * OpenLawForm requires:
 *   - apiClient {object}: OpenLaw helper `new APIClient('...')` instance
 *   - executionResult {object}
 *   - parameters {array}
 *   - onChangeFunction {(key: String, ?value: String, ?force: Boolean) => any}
 *   - openLaw {object}
 *   - variables {array}
 */
class Form extends Component {
  static defaultProps = {
    stateLifter: () => {},
  };

  // trick eslint
  static propTypes = {
    stateLifter: () => {},
  };

  state = {
    definedValues: {},
    executionResult: {},
    parameters: {},
    variables: [],
  };

  componentDidMount() {
    this.update();
  }

  update = (key, value) => {
    const updatedDraftParameters = key
      ? ({
        ...this.state.parameters,
        [key]: value,
      }) : (
        this.state.parameters
      );

    this.setState(({ parameters }) => {
      const concatParameters = { ...parameters, ...updatedDraftParameters };
      // https://docs.openlaw.io/openlaw-object/#compiletemplate
      const { compiledTemplate } = Openlaw.compileTemplate(SampleTemplateText);
      // https://docs.openlaw.io/openlaw-object/#execute
      const { executionResult, errorMessage } = Openlaw.execute(compiledTemplate, {}, concatParameters);

      if (errorMessage) {
        // eslint-disable-next-line no-undef
        console.error('Openlaw Execution Error:', errorMessage);
        return;
      }

      const state = {
        executionResult,
        parameters: concatParameters,
        // https://docs.openlaw.io/openlaw-object/#getexecutedvariables
        variables: Openlaw.getExecutedVariables(executionResult, {}),
      };

      // send props up
      this.props.stateLifter(state);

      return state;
    });
  };

  render() {
    const inlineStyle = `
      .openlaw-form {
        margin-right: 24px;
        width: 50%;
      }
    `;

    return (
      <Fragment>
        <style type="text/css">{inlineStyle}</style>
        {Object.keys(this.state.executionResult).length && (
          <OpenLawForm
            apiClient={apiClient}
            executionResult={this.state.executionResult}
            parameters={this.state.parameters}
            onChangeFunction={this.update}
            openLaw={Openlaw}
            renderSections={sectionsRenderer}
            sectionTransform={(section, index) => {
              // Transform & shape your sections here!
              // Must return an Object.
              // See the sectionsRenderer below for usage.
              return { section, mySuperCustomKey: `${index + 1}. `, index };
            }}
            textLikeInputClass="input"
            unsectionedTitle=""
            variables={this.state.variables}
          />
        )}
      </Fragment>
    );
  }
}

// eslint-disable-next-line react/prop-types
const sectionsRenderer = ({ children, ...sectionData }) => {
  const { section, mySuperCustomKey, index } = sectionData;

  return (
    Object.keys(sectionData).length && section
      // the section has a title
      ? (
        <Collapsible
          key={`section-${section}`}
          open={index === 0}
          overflowWhenOpen="visible"
          trigger={`${mySuperCustomKey || ''}${section}`}
          triggerDisabled={false}
        >
          {children()}
        </Collapsible>
      // section exists but no title, e.g. unsectionedTitle
      ) : (
        <Fragment key={`section-${section}`}>
          {children()}
        </Fragment>
      )
  );
};

const styles = {
  previewButton: {
    background: '#6c6cff',
    border: 'none',
    color: '#F9F9F9',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '1em',
    padding: '12px 24px',
    position: 'fixed',
    right: 0,
    top: 0,
  },
  pre: {
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap',
  },
  wrapApp: {
    display: 'flex',
    justifyContent: 'space-between',
  },
};

const renderPreviewHTML = (formState, callback) => () => {
  const { executionResult } = formState;
  const { agreement } = Openlaw.getAgreements(executionResult)[0];

  callback(Openlaw.renderForPreview(agreement, {}, {}));
};

const App = () => {
  const [formState, liftFormState] = useState();
  const [previewHTML, setPreviewHTML] = useState();

  useEffect(() => {
    // Scroll to top if there's a preview
    const previewHTMLElement = document.getElementById('openlaw-preview-html');
    if (previewHTMLElement) previewHTMLElement.scrollIntoView();
  }, [previewHTML]);

  return (
    <div>
      {previewHTML && (
        <Fragment>
          <div
            dangerouslySetInnerHTML={{ __html: previewHTML }}
            id="openlaw-preview-html"
          />

          <hr />
        </Fragment>
      )}

      <button
        onClick={renderPreviewHTML(formState, setPreviewHTML)}
        style={styles.previewButton}
      >
        Preview
      </button>

      <div style={styles.wrapApp}>
        <Form stateLifter={liftFormState} />
        <div>
          <pre style={styles.pre}>{SampleTemplateText}</pre>
        </div>
      </div>
    </div>
  );
};

render(<App />, document.getElementById('root'));
