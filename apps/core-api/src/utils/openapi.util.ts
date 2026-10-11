import { ZodSchema } from 'zod';

/**
 * OpenAPI Generator Utility
 *
 * Per TRD §13.4:
 * Converts Zod schemas used for runtime validation into OpenAPI specification JSON
 * so API contracts stay perfectly in sync without manual schema drift.
 */
export interface OpenApiEndpointMeta {
  path: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  summary: string;
  description?: string;
  tags?: string[];
  requestSchema?: ZodSchema;
  responseSchema?: ZodSchema;
}

export function generateOpenApiSpec(endpoints: OpenApiEndpointMeta[]) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'CarbonIQ API Spec',
      version: '1.0.0',
      description: 'AI-Powered Carbon Accounting & ESG Compliance Platform API',
    },
    paths: endpoints.reduce((acc, ep) => {
      if (!acc[ep.path]) acc[ep.path] = {};
      acc[ep.path][ep.method] = {
        summary: ep.summary,
        description: ep.description ?? ep.summary,
        tags: ep.tags ?? ['General'],
        responses: {
          '200': { description: 'Success' },
          '400': { description: 'Validation Error' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not Found' },
          '500': { description: 'Internal Server Error' },
        },
      };
      return acc;
    }, {} as Record<string, any>),
  };
}
