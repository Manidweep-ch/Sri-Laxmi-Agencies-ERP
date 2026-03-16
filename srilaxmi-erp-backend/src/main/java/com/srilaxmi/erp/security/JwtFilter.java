package com.srilaxmi.erp.security;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private static final long serialVersionUID = 1L;

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(@SuppressWarnings("null") HttpServletRequest request,
                                    @SuppressWarnings("null") HttpServletResponse response,
                                    @SuppressWarnings("null") FilterChain filterChain)
            throws ServletException, IOException {

        HttpServletRequest req = (HttpServletRequest) request;

        String authHeader = req.getHeader("Authorization");

        if(authHeader != null && authHeader.startsWith("Bearer ")){

            String token = authHeader.substring(7);

            if(jwtUtil.validateToken(token)){

                String username = jwtUtil.extractUsername(token);
                
                // For production readiness, you should extract roles from token or DB
                // Here we'll just set it to simple User for now or pass appropriate roles
                @SuppressWarnings("null")
				UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                                username,
                                null,
                                java.util.Collections.emptyList());

                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }

	public static long getSerialversionuid() {
		return serialVersionUID;
	}
}